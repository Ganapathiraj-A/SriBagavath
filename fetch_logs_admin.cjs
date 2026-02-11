const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
    process.env.GCLOUD_PROJECT = 'antigravity-app-5c1ff';
    admin.initializeApp({
        credential: admin.credential.cert(require('./secrets/service-account.json')),
        projectId: 'antigravity-app-5c1ff'
    });

    const db = admin.firestore();
    console.log("Fetching latest diagnostic reports...");

    try {
        const snap = await db.collection('diagnostic_reports').orderBy('timestamp', 'desc').limit(5).get();

        if (snap.empty) {
            console.log("No logs found.");
            return;
        }

        snap.docs.forEach((doc, i) => {
            const data = doc.data();
            const filename = `remote_log_${i}.txt`;
            const content = `Report ID: ${data.reportId}
User: ${data.email} (${data.userId})
Device ID: ${data.deviceId}
Version: ${data.appVersion}
Platform: ${data.platform}
Timestamp: ${data.timestamp?.toDate().toISOString() || 'N/A'}

${data.logs}`;
            fs.writeFileSync(filename, content);
            console.log(`Saved ${filename}`);
        });
    } catch (error) {
        console.error("Error fetching logs:", error.message);
    }
}

main();
