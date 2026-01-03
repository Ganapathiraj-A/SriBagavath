import admin from 'firebase-admin';
import fs from 'fs';

// CONFIGURATION
const DRY_RUN = process.env.DRY_RUN !== 'false'; // Default to true for safety
const PROD_SERVICE_ACCOUNT = '../SriBagavath/service-account.json';

console.log(`Environment: ${DRY_RUN ? 'DRY RUN (No changes will be made)' : 'LIVE (Changes will be applied)'}`);

// Helper to read JSON files
const readJson = (path) => {
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${path}:`, e.message);
        return null;
    }
};

const prodAccount = readJson(PROD_SERVICE_ACCOUNT);
if (!prodAccount) {
    console.error("CRITICAL: Missing production service account file.");
    process.exit(1);
}

// Initialize Prod App
console.log(`Connecting to Production: ${prodAccount.project_id}`);
const prodApp = admin.initializeApp({ credential: admin.credential.cert(prodAccount) }, 'prod_patch');
const db = prodApp.firestore();

async function migrate() {
    try {
        console.log("Fetching transactions...");
        const snapshot = await db.collection('transactions').get();
        console.log(`Found ${snapshot.size} documents in 'transactions'.`);

        let patchedCount = 0;
        let skippedCount = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // Check if itemType is missing
            if (!data.itemType) {
                if (DRY_RUN) {
                    console.log(`[DRY RUN] Would patch document ${doc.id} with itemType: 'PROGRAM'`);
                } else {
                    await doc.ref.update({
                        itemType: 'PROGRAM'
                    });
                    console.log(`[LIVE] Patched document ${doc.id}`);
                }
                patchedCount++;
            } else {
                skippedCount++;
            }
        }

        console.log("\n====================================================");
        console.log(`Migration Summary (${DRY_RUN ? 'DRY RUN' : 'LIVE'}):`);
        console.log(`  Total processed: ${snapshot.size}`);
        console.log(`  Documents ${DRY_RUN ? 'to be patched' : 'patched'}: ${patchedCount}`);
        console.log(`  Documents skipped (already has itemType): ${skippedCount}`);
        console.log("====================================================\n");

        if (DRY_RUN && patchedCount > 0) {
            console.log("To apply changes, run: DRY_RUN=false node migrate_prod_transactions.mjs");
        }

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

migrate();
