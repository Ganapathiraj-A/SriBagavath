const admin = require('firebase-admin');
const serviceAccount = require('../secrets/service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const mappings = {
    "25c0GIm6NtZVEbDSVdUZ": "ஆனந்த்",
    "2Na0LdJnpvn2HL7vwI62": "சௌந்தர்",
    "3zYvPvhwM9p5fkKbahqA": "வி. ஏ. பி. சரவணன்",
    "6w2e85dtdmcdwRkkRD0g": "ரதி தேவி",
    "7Z6zcSLgrVoar5jFXTUf": "கௌரிஷங்கர்",
    "8msLoiZcaaAcvEu7BDE0": "வெங்கடேஷ்",
    "9F47XX0JtHC1xnK9UWYT": "அன்புகரசி",
    "BJpHNIg0Onw5NXJwCTwU": "ஜெயக்குமார்",
    "CILj8cIqF6qXdnYMezbk": "கைலாசம் ப்ரவாக்",
    "FqKTwtyad1lFDlkJy9wm": "மயில் வாகனன்",
    "GCcN9CQiRWuwDVpdtZZ1": "ஸ்ரீ பகவத் அய்யா",
    "IeZmNb55vEKl0tuLJnA9": "சங்கர நாராயணன்",
    "RXlbmys2alX5LfQuqae2": "பிரகாஷ்",
    "TTSh3wmsHCbPRpMrXcdO": "ராஜாராம்",
    "VIffBgKOjugFGENogf6Z": "அங்கப்பன்",
    "XQ6BlHfTXVMfIfwDeb07": "நிருபமா",
    "fe78n6TTydYxtbJlj1bT": "கே. எஸ். ஜீவமணி",
    "jcyfi4u8HdQOyqHjTxeU": "பாஸ்கர்",
    "nUXJ9KFwOqjPEoGAYkOk": "மணி ராஜ்",
    "pJgmyKSWg1igyJYRD3xd": "பால சுப்பிரமணியன்",
    "zTKtJHpmBxE4HzlzjmFN": "அர்ஜுன் ராஜ்"
};

async function migrate() {
    console.log('--- Starting COMPLETE Teacher Localization Migration (21 Total) ---');
    let successCount = 0;
    let failCount = 0;

    for (const [id, tamilName] of Object.entries(mappings)) {
        try {
            console.log(`Updating teacher ${id} -> ${tamilName}...`);
            
            // 1. Update primary teachers collection
            await db.collection('teachers').doc(id).update({
                nameTamil: tamilName
            });

            // 2. Update legacy daily_zoom_teachers collection
            await db.collection('daily_zoom_teachers').doc(id).update({
                nameTamil: tamilName
            }).catch(e => {
                console.warn(`  Legacy update skipped for ${id} (possibly not in daily_zoom): ${e.message}`);
            });

            successCount++;
        } catch (err) {
            console.error(`  Error updating ${id}:`, err.message);
            failCount++;
        }
    }

    console.log('------------------------------------------------');
    console.log(`Migration Complete! Success: ${successCount}, Failed: ${failCount}`);
    console.log('--- Ending Teacher Localization Migration ---');
    process.exit(successCount === Object.keys(mappings).length ? 0 : 1);
}

migrate();
