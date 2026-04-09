import { db } from '@/firebase';
import { doc, getDoc, setDoc } from '@/utils/FirestoreProxy';

/**
 * Learned translation system for cities and frequent terms.
 * Stores mappings in 'learned_translations/cities' document.
 */
export const TranslationUtils = {
    /**
     * Get learned Tamil translation for a city
     */
    async getLearnedCity(englishCity) {
        if (!englishCity) return '';
        try {
            const docRef = doc(db, 'learned_translations', 'cities');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                return data[englishCity.toLowerCase()] || '';
            }
        } catch (err) {
            console.warn('Error fetching learned city:', err);
        }
        return '';
    },

    /**
     * Save/Update learned Tamil translation for a city
     */
    async saveLearnedCity(englishCity, tamilCity) {
        if (!englishCity || !tamilCity) return;
        try {
            const docRef = doc(db, 'learned_translations', 'cities');
            await setDoc(docRef, {
                [englishCity.toLowerCase()]: tamilCity
            }, { merge: true });
        } catch (err) {
            console.warn('Error saving learned city:', err);
        }
    }
};
