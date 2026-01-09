import * as pdfjsLib from 'pdfjs-dist';

// Set worker path to local file for better reliability in Capacitor/Android environments
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const generateFingerprint = (date, amount, desc) => {
    const raw = `${date}_${amount}_${desc}`.replace(/\s+/g, ' ');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `hdfc_${date.replace(/\//g, '')}_${Math.abs(hash).toString(36)}`;
};

/**
 * Parses an HDFC Bank Statement PDF.
 * @param {File} file - The PDF file object.
 * @param {string} password - The PDF password.
 * @returns {Promise<Array>} - Array of transaction objects.
 */
export const parseHdfcStatement = async (file, password) => {
    const fallbackPassword = "43283924";
    const passwordsToTry = [password, fallbackPassword].filter(p => p && p.trim() !== "");

    let lastError = null;

    for (const pw of passwordsToTry) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({
                data: arrayBuffer,
                password: pw
            });

            const pdf = await loadingTask.promise;
            let allText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join('\n');
                allText += pageText + '\n';
            }

            return parseHdfcText(allText);
        } catch (error) {
            lastError = error;
            console.error(`PDF Parsing Attempt with password failed:`, error.name, error.message);
            // If it's a password error, we continue to fallback. 
            // Otherwise (e.g. worker error), we might want to stop, but let's try fallback anyway.
            if (error.name === 'PasswordException') continue;
            break;
        }
    }

    // If we reach here, it failed for all tried passwords or encountered a fatal error
    if (lastError) {
        if (lastError.name === 'PasswordException') {
            throw new Error("Incorrect Password. Please check your settings.");
        }
        throw new Error(`PDF Error: ${lastError.message || lastError.name || "Unknown error"}`);
    }
    throw new Error("Failed to initialize PDF parsing.");
};

/**
 * Internal parser for the extracted text.
 * Handles the HDFC "Date -> Narration -> Amount -> Balance" flow.
 */
const parseHdfcText = (text) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const transactions = [];

    // HDFC Date Pattern at start of line: DD/MM/YY or DD/MM/YYYY
    const dateRegex = /^(\d{2}\/\d{2}\/\d{2,4})/;
    // Amount Pattern: 1,234.56 or 1234.56
    const amountRegex = /(\d{1,3}(?:\,\d{3})*(?:\.\d{2}))/g;
    // UPI ID Pattern: something@something
    const upiRegex = /([a-zA-Z0-9\.\-_]{2,256}@[a-zA-Z]{2,64})/;

    let currentTx = null;

    for (const line of lines) {
        if (dateRegex.test(line)) {
            // Finalize currentTx if it exists
            if (currentTx) {
                const allAmounts = currentTx.desc.match(amountRegex) || [];
                if (allAmounts.length >= 2) {
                    currentTx.amount = parseFloat(allAmounts[allAmounts.length - 2].replace(/,/g, ''));
                } else if (allAmounts.length === 1) {
                    currentTx.amount = parseFloat(allAmounts[0].replace(/,/g, ''));
                }

                // Extract UPI ID if present
                const upiMatch = currentTx.desc.match(upiRegex);
                if (upiMatch) {
                    currentTx.upiId = upiMatch[1];
                }

                transactions.push(currentTx);
            }

            const dateMatch = line.match(dateRegex);
            const date = dateMatch ? dateMatch[0] : '';
            currentTx = {
                date: date,
                desc: line.replace(date, '').trim(),
                amount: null,
                type: 'CR',
                upiId: null
            };
        } else if (currentTx) {
            currentTx.desc += ' ' + line;
        }
    }

    if (currentTx) {
        const allAmounts = currentTx.desc.match(amountRegex) || [];
        if (allAmounts.length >= 2) {
            currentTx.amount = parseFloat(allAmounts[allAmounts.length - 2].replace(/,/g, ''));
        } else if (allAmounts.length === 1) {
            currentTx.amount = parseFloat(allAmounts[0].replace(/,/g, ''));
        }

        // Extract UPI ID if present
        const upiMatch = currentTx.desc.match(upiRegex);
        if (upiMatch) {
            currentTx.upiId = upiMatch[1];
        }

        transactions.push(currentTx);
    }

    return transactions.filter(tx =>
        tx.desc &&
        tx.amount &&
        !tx.desc.toUpperCase().includes('CUST ID') &&
        !tx.desc.toUpperCase().includes('ACCOUNT NO') &&
        !tx.desc.toUpperCase().includes('SRI BAGAVATH MISSION') &&
        tx.desc.length > 10
    ).map(tx => ({
        ...tx,
        fingerprint: generateFingerprint(tx.date, tx.amount, tx.desc)
    }));
};
