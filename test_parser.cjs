const fs = require('fs');

const parseHdfcText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const transactions = [];

    const dateRegex = /^(\d{2}\/\d{2}\/\d{2,4})/;
    const amountRegex = /(\d{1,3}(?:\,\d{3})*(?:\.\d{2}))/g;

    let currentTx = null;

    for (const line of lines) {
        if (dateRegex.test(line)) {
            if (currentTx) {
                // Finalize currentTx: find amounts in its collected narration
                const allAmounts = currentTx.desc.match(amountRegex) || [];
                if (allAmounts.length >= 2) {
                    currentTx.amount = parseFloat(allAmounts[allAmounts.length - 2].replace(/,/g, ''));
                } else if (allAmounts.length === 1) {
                    currentTx.amount = parseFloat(allAmounts[0].replace(/,/g, ''));
                }
                transactions.push(currentTx);
            }

            const date = line.match(dateRegex)[0];
            currentTx = {
                date: date,
                desc: line.replace(date, '').trim()
            };
        } else if (currentTx) {
            currentTx.desc += ' ' + line;
        }
    }
    if (currentTx) {
        const allAmounts = currentTx.desc.match(amountRegex) || [];
        if (allAmounts.length >= 2) {
            currentTx.amount = parseFloat(allAmounts[allAmounts.length - 2].replace(/,/g, ''));
        }
        transactions.push(currentTx);
    }

    return transactions.filter(tx =>
        tx.desc &&
        tx.amount &&
        !tx.desc.includes('Cust ID') &&
        !tx.desc.includes('Account No') &&
        tx.desc.length > 10
    );
};

const text = fs.readFileSync('temp_raw.txt', 'utf8');
const results = parseHdfcText(text);

console.log(`Parsed ${results.length} transactions.`);

const search = results.filter(tx => tx.desc.toUpperCase().includes('BHAVANI SUBRAMANI'));
console.log("\nSearch result for BHAVANI SUBRAMANI:");
console.log(JSON.stringify(search, null, 2));

const search2 = results.filter(tx => tx.desc.toUpperCase().includes('KARUPPASAMY'));
console.log("\nSearch result for KARUPPASAMY:");
console.log(JSON.stringify(search2, null, 2));
