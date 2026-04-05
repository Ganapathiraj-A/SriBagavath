import admin from 'firebase-admin';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SECRETS_SERVICE_ACCOUNT = join(__dirname, '../secrets/service-account.json');
const ROOT_SERVICE_ACCOUNT = join(__dirname, '../service-account.json');
const SERVICE_ACCOUNT_PATH = existsSync(SECRETS_SERVICE_ACCOUNT) ? SECRETS_SERVICE_ACCOUNT : ROOT_SERVICE_ACCOUNT;
const OUTPUT_PATH = join(__dirname, '../src/data/emedia.json');
const ENV_PATH = join(__dirname, '../.env');

// Simple .env parser
function getEnvVar(name) {
  if (!existsSync(ENV_PATH)) return process.env[name];
  const envContent = readFileSync(ENV_PATH, 'utf8');
  const match = envContent.match(new RegExp(`${name}=(.*)`));
  return match ? match[1].trim() : process.env[name];
}

const DRIVE_API_KEY = getEnvVar('VITE_GOOGLE_DRIVE_API_KEY');

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error('Error: service-account.json not found at', SERVICE_ACCOUNT_PATH);
  process.exit(1);
}

if (!DRIVE_API_KEY) {
  console.error('Error: VITE_GOOGLE_DRIVE_API_KEY not found in .env');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function fetchDriveFiles(folderId) {
  return new Promise((resolve, reject) => {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent('files(id,name,webViewLink,iconLink,mimeType,modifiedTime,size)');
    const orderBy = 'name_natural';
    const url = `https://www.googleapis.com/drive/v3/files?key=${DRIVE_API_KEY}&q=${query}&fields=${fields}&orderBy=${orderBy}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Drive API error ${res.statusCode}: ${data}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.files || []);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function fetchEMedia() {
  console.log('Fetching E Media data from Firestore and Google Drive...');
  
  try {
    // 1. Fetch Audio Books
    const audioBooksSnap = await db.collection('audio_books').orderBy('order', 'asc').get();
    const audioBooks = audioBooksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Fetch Related Videos
    const videosSnap = await db.collection('relatedVideos').get();
    const videos = videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    videos.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

    // 3. Fetch Public Settings (for PDF Books / Magazines)
    const settingsSnap = await db.collection('settings').doc('public').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    const languages = settings.digitalBookLanguages || [];

    // 4. Fetch Digital Book Configs & Covers
    const configsSnap = await db.collection('digital_book_configs').get();
    const configs = {};
    configsSnap.forEach(doc => {
      configs[doc.id] = doc.data();
    });

    const bookCoversSnap = await db.collection('book_covers').get();
    const bookCovers = {};
    bookCoversSnap.forEach(doc => {
      bookCovers[doc.id] = doc.data().cover;
    });

    // 5. Fetch PDF Book Lists for each language
    const pdfBooksByLanguage = {};
    for (const lang of languages) {
      console.log(`Fetching files for ${lang.name} (${lang.folderId})...`);
      try {
        const files = await fetchDriveFiles(lang.folderId);
        pdfBooksByLanguage[lang.id] = files.map(file => {
          const config = configs[file.id];
          let cover = null;
          if (config) {
            cover = config.imageUrl || config.cover || config.linkedBookCover;
            if (!cover && config.linkedBookId) {
              cover = bookCovers[config.linkedBookId];
            }
          }
          return {
            ...file,
            cover
          };
        });
      } catch (err) {
        console.error(`Failed to fetch files for ${lang.name}:`, err.message);
        pdfBooksByLanguage[lang.id] = [];
      }
    }

    // 6. Fetch Monthly Magazine issues recursively (one level deep)
    const magazineData = {
      root: [],
      folders: {} // folderId -> files
    };

    if (settings.driveMagazineId) {
      console.log('Fetching Monthly Magazine issues...');
      try {
        const rootFiles = await fetchDriveFiles(settings.driveMagazineId);
        // Sort: Latest first
        rootFiles.sort((a, b) => b.name.localeCompare(a.name));
        magazineData.root = rootFiles;

        for (const file of rootFiles) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            console.log(`  Fetching sub-files for ${file.name} (${file.id})...`);
            try {
              const subFiles = await fetchDriveFiles(file.id);
              subFiles.sort((a, b) => b.name.localeCompare(a.name));
              magazineData.folders[file.id] = subFiles;
            } catch (err) {
              console.error(`  Failed to fetch sub-files for ${file.name}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch magazine root:', err.message);
      }
    }

    const data = {
      generatedAt: new Date().toISOString(),
      audioBooks,
      videos: {
        general: videos.filter(v => (v.category || 'general') === 'general'),
        teachers: videos.filter(v => v.category === 'teachers')
      },
      digitalBooks: {
        languages: languages.map(lang => ({
          ...lang,
          books: pdfBooksByLanguage[lang.id] || []
        })),
        magazineFolderId: settings.driveMagazineId,
        magazineData: magazineData
      }
    };

    // Ensure output directory exists
    const outDir = dirname(OUTPUT_PATH);
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }

    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));
    console.log('Successfully saved comprehensive E Media data to', OUTPUT_PATH);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fetching E Media data:', error);
    process.exit(1);
  }
}

fetchEMedia();
