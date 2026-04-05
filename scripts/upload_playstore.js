import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Uploads an AAB to the Google Play Store.
 * 
 * Requirements:
 * 1. service-account.json in the project root.
 * 2. Proper permissions ("Release Manager") in Play Console for this service account.
 */

async function uploadToPlayStore() {
    const packageName = "com.bhavathpathai.app";
    const authKeyPath = path.resolve(process.cwd(), 'service-account.json');
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const version = packageJson.version;
    const aabPath = path.resolve(process.cwd(), `SriBagavath_v${version}.aab`);

    // Track can be passed as first argument: node scripts/upload_playstore.js production
    const trackName = process.argv[2] || process.env.PLAYSTORE_TRACK || 'internal';

    console.log(`Starting Play Store upload for ${packageName} v${version}...`);
    console.log(`Track: ${trackName}`);
    console.log(`Artifact: ${aabPath}`);

    if (!fs.existsSync(authKeyPath)) {
        console.error("ERROR: service-account.json not found in project root.");
        process.exit(1);
    }

    if (!fs.existsSync(aabPath)) {
        console.error(`ERROR: AAB file not found at ${aabPath}`);
        process.exit(1);
    }

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: authKeyPath,
            scopes: ['https://www.googleapis.com/auth/androidpublisher']
        });

        const publisher = google.androidpublisher({
            version: 'v3',
            auth
        });

        // 1. Start a new edit
        console.log("Creating new edit...");
        const edit = await publisher.edits.insert({
            packageName
        });
        const editId = edit.data.id;

        // 2. Upload the AAB
        console.log("Uploading AAB bundle (this may take a minute)...");
        const bundle = await publisher.edits.bundles.upload({
            editId,
            packageName,
            media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(aabPath)
            }
        });

        const versionCode = bundle.data.versionCode;
        console.log(`✅ AAB uploaded successfully. Version Code: ${versionCode}`);

        // 3. Prepare Release Notes
        const releaseNotes = [];
        const notesDir = path.resolve(process.cwd(), 'metadata/release-notes');
        if (fs.existsSync(notesDir)) {
            const files = fs.readdirSync(notesDir);
            for (const file of files) {
                if (file.endsWith('.txt')) {
                    const language = file.replace('.txt', '');
                    const text = fs.readFileSync(path.join(notesDir, file), 'utf8');
                    releaseNotes.push({ language, text });
                    console.log(`- Loaded release notes for: ${language}`);
                }
            }
        }

        // 4. Assign to track
        console.log(`Assigning version ${versionCode} to track: ${trackName}...`);
        
        await publisher.edits.tracks.update({
            editId,
            packageName,
            track: trackName,
            requestBody: {
                releases: [
                    {
                        versionCodes: [versionCode.toString()],
                        status: 'completed',
                        releaseNotes: releaseNotes.length > 0 ? releaseNotes : undefined
                    }
                ]
            }
        });

        // 5. Commit the edit
        console.log("Committing changes...");
        await publisher.edits.commit({
            editId,
            packageName
        });

        console.log(`======================================`);
        console.log(`✅ SUCCESSFULLY PUBLISHED TO PLAY STORE!`);
        console.log(`Track: ${trackName}`);
        console.log(`======================================`);

    } catch (error) {
        console.error("❌ ERROR uploading to Play Store:");
        console.error(error.message);
        if (error.response && error.response.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

uploadToPlayStore();
