const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Initialize Admin SDK
// Using the service account from the secrets directory
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.firebasestorage.app`
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Downloads an image from a URL to a local destination.
 */
async function downloadImage(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to download: ${res.statusCode} for URL: ${url}`));
        return;
      }
      const fileStream = fs.createWriteStream(dest);
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', (err) => {
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Main migration function.
 */
async function migrate() {
  try {
    const snapshot = await db.collection('gallery').get();
    console.log(`Found ${snapshot.size} images to migrate.`);

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const currentUrl = data.url;

      // Skip if already in Firebase Storage
      if (currentUrl.includes('firebasestorage.googleapis.com') || currentUrl.includes('storage.googleapis.com')) {
        console.log(`Skipping already migrated: ${docSnapshot.id}`);
        continue;
      }

      console.log(`Migrating: ${docSnapshot.id} (${currentUrl})`);
      
      const fileName = `${docSnapshot.id}.jpg`;
      const tempFilePath = path.join(__dirname, `temp_${fileName}`);
      
      try {
        await downloadImage(currentUrl, tempFilePath);
        
        const destination = `gallery/${fileName}`;
        
        // Upload to Firebase Storage
        const [file] = await bucket.upload(tempFilePath, {
          destination,
          metadata: {
            contentType: 'image/jpeg',
          }
        });

        // Make the file publicly accessible
        await file.makePublic();

        // Construct a public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
        
        // Update Firestore
        await docSnapshot.ref.update({
          url: publicUrl,
          storagePath: destination,
          migratedAt: admin.firestore.FieldValue.serverTimestamp(),
          originalUrl: currentUrl
        });

        console.log(`✅ Successfully migrated ${docSnapshot.id} to ${publicUrl}`);
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${docSnapshot.id}:`, error.message);
      } finally {
        // Cleanup temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }
    console.log('\nMigration process completed!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

migrate().then(() => {
  process.exit(0);
});
