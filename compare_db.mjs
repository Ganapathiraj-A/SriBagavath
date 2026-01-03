import admin from 'firebase-admin';
import fs from 'fs';

// Helper to read JSON files (handling possible errors)
const readJson = (path) => {
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (e) {
        console.error(`Error reading ${path}:`, e.message);
        return null;
    }
};

console.log("Loading service accounts...");
const devAccount = readJson('./service-account.json');
const prodAccount = readJson('../SriBagavath/service-account.json');

if (!devAccount || !prodAccount) {
    console.error("CRITICAL: Missing one or both service account files.");
    process.exit(1);
}

// Initialize Apps
console.log(`Initializing Dev App: ${devAccount.project_id}`);
const devApp = admin.initializeApp({ credential: admin.credential.cert(devAccount) }, 'dev');

console.log(`Initializing Prod App: ${prodAccount.project_id}`);
const prodApp = admin.initializeApp({ credential: admin.credential.cert(prodAccount) }, 'prod');

const devDb = devApp.firestore();
const prodDb = prodApp.firestore();

async function getCollectionSummary(db) {
    const collections = await db.listCollections();
    const summary = {};
    for (const col of collections) {
        // Sample docs to infer schema
        const snapshot = await col.limit(10).get();
        const docs = snapshot.docs.map(d => d.data());
        const allFields = new Set();
        docs.forEach(doc => Object.keys(doc).forEach(k => allFields.add(k)));

        // Use aggregate for counts (faster for large collections)
        const countRes = await col.count().get();
        const totalDocs = countRes.data().count;

        summary[col.id] = {
            fields: Array.from(allFields).sort(),
            count: totalDocs
        };
    }
    return summary;
}

async function run() {
    try {
        console.log("Fetching Dev DB structure (root collections)...");
        const devSummary = await getCollectionSummary(devDb);

        console.log("Fetching Prod DB structure (root collections)...");
        const prodSummary = await getCollectionSummary(prodDb);

        const report = {
            collectionsInDevOnly: [],
            collectionsInProdOnly: [],
            differences: []
        };

        const devColIds = Object.keys(devSummary);
        const prodColIds = Object.keys(prodSummary);

        // Find collections unique to Dev
        devColIds.forEach(id => {
            if (!prodColIds.includes(id)) report.collectionsInDevOnly.push({ id, count: devSummary[id].count });
        });

        // Find collections unique to Prod
        prodColIds.forEach(id => {
            if (!devColIds.includes(id)) report.collectionsInProdOnly.push({ id, count: prodSummary[id].count });
        });

        // Compare common collections
        devColIds.filter(id => prodColIds.includes(id)).forEach(id => {
            const devFields = devSummary[id].fields;
            const prodFields = prodSummary[id].fields;
            const missingInProd = devFields.filter(f => !prodFields.includes(f));
            const missingInDev = prodFields.filter(f => !devFields.includes(f));

            if (missingInProd.length > 0 || missingInDev.length > 0) {
                report.differences.push({
                    id,
                    missingInProd,
                    missingInDev,
                    devDocCount: devSummary[id].count,
                    prodDocCount: prodSummary[id].count
                });
            }
        });

        // Generate Human-Readable Output
        console.log("\n====================================================");
        console.log("FIRESTORE STRUCTURE COMPARISON REPORT");
        console.log("Dev:", devAccount.project_id);
        console.log("Prod:", prodAccount.project_id);
        console.log("====================================================\n");

        if (report.collectionsInDevOnly.length > 0) {
            console.log("NEW COLLECTIONS (In Dev, not in Prod):");
            report.collectionsInDevOnly.forEach(c => console.log(`  - ${c.id} (${c.count} docs)`));
            console.log("");
        }

        if (report.collectionsInProdOnly.length > 0) {
            console.log("LEGACY/PRODUCTION ONLY COLLECTIONS:");
            report.collectionsInProdOnly.forEach(c => console.log(`  - ${c.id} (${c.count} docs)`));
            console.log("");
        }

        if (report.differences.length > 0) {
            console.log("FIELD-LEVEL DIFFERENCES IN COMMON COLLECTIONS:");
            report.differences.forEach(diff => {
                console.log(`\n[${diff.id}] (Dev: ${diff.devDocCount}, Prod: ${diff.prodDocCount})`);
                if (diff.missingInProd.length > 0) {
                    console.log("  FIELDS MISSING IN PROD (Needs Migration):");
                    diff.missingInProd.forEach(f => console.log(`    - ${f}`));
                }
                if (diff.missingInDev.length > 0) {
                    console.log("  FIELDS IN PROD ONLY (Legacy?):");
                    diff.missingInDev.forEach(f => console.log(`    - ${f}`));
                }
            });
        } else {
            console.log("Common collections have identical sampled schemas.");
        }

        console.log("\n====================================================");
        console.log("ACTIONS REQUIRED FOR MIGRATION:");
        if (report.collectionsInDevOnly.length > 0) {
            console.log("1. Create new collections in Production if they contain shared data.");
        }
        if (report.differences.some(d => d.missingInProd.length > 0)) {
            console.log("2. Run a migration script to add missing fields to Production documents.");
        }
        console.log("3. Verify Firestore Rules for new/updated collections.");
        console.log("====================================================");

    } catch (err) {
        console.error("Comparison failed:", err);
    } finally {
        process.exit(0);
    }
}

run();
