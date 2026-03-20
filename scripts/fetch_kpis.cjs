import { google } from 'googleapis';
import path from 'path';

/**
 * Fetches KPIs (Reviews, Vitals) from the Google Play Store.
 */

async function fetchKPIs() {
    const packageName = "com.bhavathpathai.app";
    const authKeyPath = path.resolve(process.cwd(), 'service-account.json');

    console.log(`\n======================================`);
    console.log(`   PLAY STORE KPI DASHBOARD: ${packageName}   `);
    console.log(`======================================\n`);

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: authKeyPath,
            scopes: [
                'https://www.googleapis.com/auth/androidpublisher',
                'https://www.googleapis.com/auth/playdeveloperreporting',
                'https://www.googleapis.com/auth/analytics.readonly',
                'https://www.googleapis.com/auth/monitoring.read'
            ]
        });

        const publisher = google.androidpublisher({ version: 'v3', auth });
        const reporting = google.playdeveloperreporting({ version: 'v1beta1', auth });
        const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
        const monitoring = google.monitoring({ version: 'v3', auth });

        // 0. Fetch Analytics (GA4) - Usage Stats
        const propertyId = "514862515"; // Sri Bagavath Property ID
        console.log(`Fetching Analytics (GA4) for Property ${propertyId}...`);
        try {
            // A. Fetch Total Users (All Time)
            const totalUsersRes = await analyticsData.properties.runReport({
                property: `properties/${propertyId}`,
                requestBody: {
                    dateRanges: [{ startDate: '2020-01-01', endDate: 'today' }],
                    metrics: [{ name: 'totalUsers' }]
                }
            });
            const allTimeTotal = totalUsersRes.data.rows?.[0]?.metricValues?.[0]?.value || "Unknown";
            console.log(`🌍 TOTAL INSTALLED USERS (All Time): ${allTimeTotal}`);
            console.log("--------------------------------------\n");

            // B. Fetch Multi-Period Usage
            const periods = [
                { label: 'Today (Last 24h)', start: 'today', end: 'today' },
                { label: 'Last 7 Days', start: '7daysAgo', end: 'today' },
                { label: 'Last 28 Days', start: '28daysAgo', end: 'today' }
            ];

            console.log(`📊 Usage Statistics:`);
            for (const p of periods) {
                const response = await analyticsData.properties.runReport({
                    property: `properties/${propertyId}`,
                    requestBody: {
                        dateRanges: [{ startDate: p.start, endDate: p.end }],
                        metrics: [
                            { name: 'activeUsers' },
                            { name: 'sessions' }
                        ]
                    }
                });

                if (response.data.rows && response.data.rows.length > 0) {
                    const row = response.data.rows[0];
                    console.log(`   [${p.label}]`);
                    console.log(`     - Users: ${row.metricValues[0].value}`);
                    console.log(`     - Sessions: ${row.metricValues[1].value}`);
                } else {
                    console.log(`   [${p.label}] No data found.`);
                }
            }
        } catch (e) {
            console.log("ℹ️  Note: Analytics data retrieval failed.");
            console.log("   Details: " + e.message);
        }

        console.log("\n--------------------------------------\n");

        // 0.1 Fetch Firestore Metrics (Cloud Monitoring)
        const firestoreProjectId = "antigravity-app-5c1ff";
        console.log(`Fetching Firestore Metrics for Project ${firestoreProjectId}...`);
        try {
            const metrics = [
                { label: 'Reads', type: 'firestore.googleapis.com/document/read_count' },
                { label: 'Writes', type: 'firestore.googleapis.com/document/write_count' },
                { label: 'Deletes', type: 'firestore.googleapis.com/document/delete_count' }
            ];

            console.log(`📈 Firestore Activity (Last 24 Hours):`);
            for (const m of metrics) {
                const res = await monitoring.projects.timeSeries.list({
                    name: `projects/${firestoreProjectId}`,
                    filter: `metric.type="${m.type}"`,
                    'interval.startTime': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                    'interval.endTime': new Date().toISOString(),
                    'aggregation.alignmentPeriod': '86400s',
                    'aggregation.perSeriesAligner': 'ALIGN_SUM',
                    'aggregation.crossSeriesReducer': 'REDUCE_SUM'
                });

                let count = 0;
                if (res.data.timeSeries && res.data.timeSeries.length > 0) {
                    // Sum up values if there are multiple time series
                    count = res.data.timeSeries.reduce((acc, ts) => {
                        const val = ts.points[0].value.int64Value || 0;
                        return acc + parseInt(val);
                    }, 0);
                }
                console.log(`   - ${m.label}: ${count}`);
            }
        } catch (e) {
            console.log("ℹ️  Note: Firestore metrics retrieval failed.");
            console.log("   Details: " + e.message);
        }

        console.log("\n--------------------------------------\n");

        // 0.2 Combined Daily Correlation Report (Last 30 Days)
        console.log(`📊 30-Day Correlation Report (Daily):`);
        console.log(`   Date       | New Usr | Act Usr | Session | Firest. Reads | Writes`);
        console.log(`   -----------|---------|---------|---------|---------------|-------`);
        try {
            const daysToFetch = 30;
            const dailyData = {};

            // 1. Fetch Daily Users & Sessions
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
                    const dateStr = row.dimensionValues[0].value; // YYYYMMDD
                    const formattedDate = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
                    dailyData[formattedDate] = { 
                        newUsers: row.metricValues[0].value,
                        activeUsers: row.metricValues[1].value, 
                        sessions: row.metricValues[2].value,
                        reads: 0,
                        writes: 0
                    };
                });
            }

            // 2. Fetch Daily Firestore Metrics (Reads/Writes)
            const metricConfigs = [
                { key: 'reads', type: 'firestore.googleapis.com/document/read_count' },
                { key: 'writes', type: 'firestore.googleapis.com/document/write_count' }
            ];

            for (const config of metricConfigs) {
                const res = await monitoring.projects.timeSeries.list({
                    name: `projects/${firestoreProjectId}`,
                    filter: `metric.type="${config.type}"`,
                    'interval.startTime': new Date(Date.now() - daysToFetch * 24 * 60 * 60 * 1000).toISOString(),
                    'interval.endTime': new Date().toISOString(),
                    'aggregation.alignmentPeriod': '86400s',
                    'aggregation.perSeriesAligner': 'ALIGN_SUM',
                    'aggregation.crossSeriesReducer': 'REDUCE_SUM'
                });

                if (res.data.timeSeries && res.data.timeSeries.length > 0) {
                    res.data.timeSeries[0].points.forEach(point => {
                        const dateStr = new Date(point.interval.endTime).toISOString().split('T')[0];
                        if (dailyData[dateStr]) {
                            dailyData[dateStr][config.key] = point.value.int64Value || 0;
                        }
                    });
                }
            }

            // 3. Print the table
            const sortedDates = Object.keys(dailyData).sort().reverse();
            for (const date of sortedDates) {
                const d = dailyData[date];
                const newU = d.newUsers.toString().padStart(7, ' ');
                const actU = d.activeUsers.toString().padStart(7, ' ');
                const sess = d.sessions.toString().padStart(7, ' ');
                const reads = d.reads.toString().padStart(13, ' ');
                const writes = d.writes.toString().padStart(5, ' ');
                console.log(`   ${date} | ${newU} | ${actU} | ${sess} | ${reads} | ${writes}`);
            }

        } catch (e) {
            console.log("ℹ️  Note: Correlation report failed.");
            console.log("   Details: " + e.message);
        }

        console.log("\n--------------------------------------\n");

        // 1. Fetch Latest Reviews
        try {
            const reviews = await publisher.reviews.list({ packageName, maxResults: 5 });
            if (reviews.data.reviews && reviews.data.reviews.length > 0) {
                reviews.data.reviews.forEach((r, i) => {
                    const comment = r.comments[0].userComment;
                    console.log(`[${i + 1}] ⭐ ${comment.starRating} | ${r.authorName}: "${comment.text.trim()}"`);
                });
            } else {
                console.log("No recent reviews found.");
            }
        } catch (e) {
            console.error("❌ Error fetching reviews: " + e.message);
        }

        console.log("\n--------------------------------------\n");

        // 2. Fetch Vitals (Crashes & ANRs) - Using Reporting API
        // For Reporting API, it often requires a resource name like 'apps/{packageName}/vitals/errors'
        console.log("Checking App Vitals (Errors & ANRs)...");
        try {
            // In v1beta1, the correct path is errors.counts.get or anrs.counts.get
            const errorMetric = await reporting.vitals.errors.counts.get({
                name: `apps/${packageName}/vitals/errors/counts`
            });
            console.log("Error Metrics:", JSON.stringify(errorMetric.data, null, 2));
            
            const anrMetric = await reporting.vitals.anrs.counts.get({
                name: `apps/${packageName}/vitals/anrs/counts`
            });
            console.log("ANR Metrics:", JSON.stringify(anrMetric.data, null, 2));
            
        } catch (e) {
            console.log("ℹ️  Note: Vitals metrics (Crashes/ANRs) may not be shown if Google hasn't collected enough data for your app yet.");
            if (e.message.includes("403")) {
                console.log("   (Permission 'View app information' might be required for the service account)");
            } else if (e.message.indexOf("404") !== -1) {
                console.log("   (Detailed vitals data is not yet available for this package - try again in 24 hours)");
            } else {
                console.log("   Details: " + e.message);
            }
        }

        console.log(`\n======================================`);
        console.log(`   DONE   `);
        console.log(`======================================\n`);

    } catch (error) {
        console.error("❌ CRITICAL ERROR:");
        console.error(error.message);
        process.exit(1);
    }
}

fetchKPIs();
