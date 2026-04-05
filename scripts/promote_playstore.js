import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

/**
 * Promotes an existing AAB (by version code) to a different track on the Play Store.
 * Does NOT require re-uploading the bundle.
 */

async function promoteOnPlayStore() {
    const packageName = "com.bhavathpathai.app";
    const authKeyPath = path.resolve(process.cwd(), 'service-account.json');
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const version = packageJson.version;
    
    // Calculate Version Code: X.Y.Z -> (X*100000) + (Y*1000) + Z
    const [major, minor, patch] = version.split('.').map(Number);
    const versionCode = (major * 100000) + (minor * 1000) + patch;

    // Target Track can be passed as first argument: node scripts/promote_playstore.js production
    const targetTrack = process.argv[2] || 'production';

    console.log(`Starting Play Store promotion for ${packageName} v${version} (Code: ${versionCode})...`);
    console.log(`Target Track: ${targetTrack}`);

    if (!fs.existsSync(authKeyPath)) {
        console.error("ERROR: service-account.json not found in project root.");
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

        // 2. Prepare Release Notes
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

        // 3. Assign the EXISTING version code to the target track
        console.log(`Promoting version ${versionCode} to track: ${targetTrack}...`);
        
        await publisher.edits.tracks.update({
            editId,
            packageName,
            track: targetTrack,
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

        // 4. Commit the edit
        console.log("Committing changes...");
        await publisher.edits.commit({
            editId,
            packageName
        });

        console.log(`======================================`);
        console.log(`✅ SUCCESSFULLY PROMOTED TO ${targetTrack.toUpperCase()}!`);
        console.log(`Version: v${version} (${versionCode})`);
        console.log(`======================================`);

    } catch (error) {
        console.error("❌ ERROR promoting on Play Store:");
        console.error(error.message);
        if (error.response && error.response.data) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

promoteOnPlayStore();
