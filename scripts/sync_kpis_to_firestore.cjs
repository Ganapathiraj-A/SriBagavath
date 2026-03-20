const { google } = require('googleapis');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function syncKPIs() {
    try {
        console.log("🚀 Starting KPI Sync to Firestore...");

        const keyPath = path.join(__dirname, '../service-account.json');
        const auth = new google.auth.GoogleAuth({
            keyFile: keyPath,
            scopes: [
                'https://www.googleapis.com/auth/androidpublisher',
                'https://www.googleapis.com/auth/playdeveloperreporting',
                'https://www.googleapis.com/auth/analytics.readonly',
                'https://www.googleapis.com/auth/monitoring.read',
                'https://www.googleapis.com/auth/cloud-platform'
            ]
        });

        // Initialize Firebase Admin
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: "antigravity-app-5c1ff"
            });
        }
        const db = admin.firestore();

        const authClient = await auth.getClient();
        const analyticsData = google.analyticsdata({ version: 'v1beta', auth: authClient });
        const monitoring = google.monitoring({ version: 'v3', auth: authClient });

        const propertyId = "514862515";
        const firestoreProjectId = "antigravity-app-5c1ff";
        const daysToFetch = 30;

        // 1. Fetch Summary Stats
        console.log("📊 Fetching All-Time Summary...");
        const totalUsersRes = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }],
                metrics: [{ name: 'totalUsers' }]
            }
        });
        const allTimeTotal = parseInt(totalUsersRes.data.rows?.[0]?.metricValues?.[0]?.value || 0);

        // 2. Fetch Multi-Period for Dashboard Snapshot
        const snapshotRes = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [
                    { name: 'today', startDate: 'today', endDate: 'today' },
                    { name: 'last7', startDate: '7daysAgo', endDate: 'today' },
                    { name: 'last28', startDate: '28daysAgo', endDate: 'today' }
                ],
                metrics: [
                    { name: 'activeUsers' },
                    { name: 'sessions' }
                ]
            }
        });

        // 3. Fetch Daily Breakdown (30 Days)
        console.log("📈 Fetching 30-Day Daily Breakdown...");
        const dailyData = {};
        const analyticsRes = await analyticsData.properties.runReport({
            property: `properties/${propertyId}`,
            requestBody: {
                dateRanges: [{ startDate: `${daysToFetch - 1}daysAgo`, endDate: 'today' }],
                dimensions: [{ name: 'date' }],
                metrics: [
                    { name: 'newUsers' },
                    { name: 'activeUsers' },
                    { name: 'sessions' }
                ]
            }
        });

        if (analyticsRes.data.rows) {
            analyticsRes.data.rows.forEach(row => {
                const dateStr = row.dimensionValues[0].value;
                const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
                dailyData[formattedDate] = { 
                    newUsers: parseInt(row.metricValues[0].value),
                    activeUsers: parseInt(row.metricValues[1].value), 
                    sessions: parseInt(row.metricValues[2].value),
                    firestoreReads: 0,
                    firestoreWrites: 0,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
                };
            });
        }

        // 4. Fetch Firestore Metrics
        const metricConfigs = [
            { key: 'firestoreReads', type: 'firestore.googleapis.com/document/read_count' },
            { key: 'firestoreWrites', type: 'firestore.googleapis.com/document/write_count' }
        ];

        for (const config of metricConfigs) {
            const res = await monitoring.projects.timeSeries.list({
                name: `projects/${firestoreProjectId}`,
                filter: `metric.type="${config.type}"`,
                'interval.startTime': new Date(Date.now() - (daysToFetch + 1) * 24 * 60 * 60 * 1000).toISOString(),
                'interval.endTime': new Date().toISOString(),
                'aggregation.alignmentPeriod': '86400s',
                'aggregation.perSeriesAligner': 'ALIGN_SUM',
                'aggregation.crossSeriesReducer': 'REDUCE_SUM'
            });

            if (res.data.timeSeries && res.data.timeSeries.length > 0) {
                res.data.timeSeries[0].points.forEach(point => {
                    const dateStr = new Date(point.interval.endTime).toISOString().split('T')[0];
                    if (dailyData[dateStr]) {
                        dailyData[dateStr][config.key] = parseInt(point.value.int64Value || 0);
                    }
                });
            }
        }

        // 5. Write to Firestore
        console.log("💾 Writing to Firestore...");
        const batch = db.batch();

        // A. Update Summary
        const summaryRef = db.collection('app_analytics').doc('summary');
        batch.set(summaryRef, {
            totalInstalledUsers: allTimeTotal,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            package: "com.bhavathpathai.app"
        }, { merge: true });

        // B. Update Daily Reports
        for (const [date, data] of Object.entries(dailyData)) {
            const dailyRef = db.collection('app_analytics').doc('daily_history').collection('dates').doc(date);
            batch.set(dailyRef, data, { merge: true });
        }

        await batch.commit();
        console.log(`✅ Success! Synced summary and ${Object.keys(dailyData).length} days of history.`);

    } catch (e) {
        console.error("❌ Sync Failed:", e);
        process.exit(1);
    }
}

syncKPIs();
