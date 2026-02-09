import { db } from '../firebase';
import { collection, query, where, getDocs, doc, writeBatch, serverTimestamp } from '@/utils/FirestoreProxy';

export const ReconciliationService = {
    /**
     * Batch process matching between bank entries and registrations/donations.
     */
    runMatching: async () => {
        const batch = writeBatch(db);
        let matchCount = 0;
        let updateCount = 0;

        try {
            // 1. Fetch Data
            const bankQuery = query(collection(db, 'bank_entries'), where('status', '!=', 'MATCHED'));

            // Optimization: Fetch most recent 1000 transactions to find matches
            // This avoids fetching the entire history while catching missing 'reconciled' fields
            const txQuery = query(
                collection(db, 'transactions'),
                orderBy('timestamp', 'desc'),
                limit(1000)
            );

            const [bankSnap, txSnap] = await Promise.all([
                getDocs(bankQuery),
                getDocs(txQuery)
            ]);

            const bankEntries = bankSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const allTransactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter in-memory to catch both reconciled: false and reconciled: undefined
            const transactions = allTransactions.filter(tx => tx.reconciled !== true);

            console.log(`Attempting matching: ${bankEntries.length} bank entries vs ${transactions.length} unreconciled transactions`);

            // 2. Perform Matching
            for (const entry of bankEntries) {
                if (entry.status === 'MATCHED') continue;

                const matchedTx = transactions.find(tx => {
                    if (!tx.utr) return false;

                    const sanitize = (s) => (s || '').toString().replace(/[^A-Z0-9]/gi, '').toUpperCase();
                    const cleanDesc = sanitize(entry.desc);
                    const cleanUtr = sanitize(tx.utr);

                    if (cleanUtr.length < 6) return false;
                    const blacklistedKeywords = ['PAY', 'PAYTM', 'GPAY', 'PHONEPE', 'UPI', 'CASH', 'BANK'];
                    if (blacklistedKeywords.includes(cleanUtr)) return false;

                    const isUtrMatch = cleanDesc.includes(cleanUtr);
                    const isAmountMatch = Math.abs(parseFloat(entry.amount)) === Math.abs(parseFloat(tx.amount));

                    if (isUtrMatch && !isAmountMatch) {
                        console.log(`Potential Match Rejected: Entry ${entry.id} matches UTR ${tx.utr} but amount mismatch (Bank: ${entry.amount}, Reg: ${tx.amount})`);

                        const txRef = doc(db, 'transactions', tx.id);
                        batch.update(txRef, {
                            amountMismatch: true,
                            mismatchedBankAmount: entry.amount,
                            mismatchedBankDesc: entry.desc,
                            mismatchedBankDate: entry.date,
                            mismatchedBankEntryId: entry.id
                        });
                        updateCount++;
                    }

                    return isUtrMatch && isAmountMatch;
                });

                if (matchedTx) {
                    console.log(`Match Found: Entry ${entry.id} matches Transaction ${matchedTx.id}`);

                    // Update Bank Entry
                    const bankRef = doc(db, 'bank_entries', entry.id);
                    batch.update(bankRef, {
                        status: 'MATCHED',
                        matchedTransactionId: matchedTx.id,
                        matchedAt: serverTimestamp()
                    });

                    // Update Transaction
                    const txRef = doc(db, 'transactions', matchedTx.id);
                    batch.update(txRef, {
                        reconciled: true,
                        reconciledAt: serverTimestamp(),
                        reconciledBy: 'SYSTEM_AUTO',
                        bankEntryId: entry.id,
                        bankDescription: entry.desc,
                        bankDate: entry.date,
                        // Clear mismatch flags
                        amountMismatch: null,
                        mismatchedBankAmount: null,
                        mismatchedBankDesc: null,
                        mismatchedBankDate: null,
                        mismatchedBankEntryId: null
                    });

                    matchCount++;
                    updateCount++;

                    // Remove from candidates to avoid double matching
                    const idx = transactions.indexOf(matchedTx);
                    if (idx > -1) transactions.splice(idx, 1);
                }
            }

            if (updateCount > 0) {
                await batch.commit();
            }

            return { success: true, matchCount };
        } catch (error) {
            console.error("Reconciliation Error:", error);
            throw error;
        }
    }
};
