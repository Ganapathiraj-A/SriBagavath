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
        console.log(`Fetching current releases for track: ${trackName}...`);
        let finalReleaseNotes = releaseNotes;

        try {
            const currentTrack = await publisher.edits.tracks.get({
                editId,
                packageName,
                track: trackName
            });

            if (currentTrack.data.releases && currentTrack.data.releases.length > 0) {
                // Find the latest release that has release notes
                const lastReleaseWithNotes = [...currentTrack.data.releases]
                    .find(r => r.releaseNotes && r.releaseNotes.length > 0);

                if (lastReleaseWithNotes) {
                    console.log(`✅ Found existing release notes for version ${lastReleaseWithNotes.versionCodes[0]}.`);
                    // Use them if our local releaseNotes is empty (keeping traditional "keep existing" logic)
                    if (finalReleaseNotes.length === 0) {
                        finalReleaseNotes = lastReleaseWithNotes.releaseNotes;
                        console.log(`- Reusing existing notes from version ${lastReleaseWithNotes.versionCodes[0]}`);
                    }
                }
            }
        } catch (fetchErr) {
            console.warn(`⚠️ Could not fetch existing track data (First release for this track?): ${fetchErr.message}`);
        }

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
                        releaseNotes: finalReleaseNotes.length > 0 ? finalReleaseNotes : undefined
                    }
                ]
            }
        });

        // 5. Commit the edit
        console.log("Committing changes...");
        const commitParams = {
            editId,
            packageName
        };
        await publisher.edits.commit(commitParams);

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
