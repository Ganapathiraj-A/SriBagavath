import { db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export const cleanupOldSchedules = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const schedulesRef = collection(db, 'schedules');
        
        // Query for schedules where toDate is strictly less than today
        // This effectively deletes anything that ended yesterday or before
        const q = query(
            schedulesRef,
            where('toDate', '<', today)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            console.log('No old schedules to cleanup.');
            return;
        }

        console.log(`Found ${querySnapshot.size} old schedules to delete.`);

        // Delete documents in parallel
        const deletePromises = querySnapshot.docs.map(document => 
            deleteDoc(doc(db, 'schedules', document.id))
        );

        await Promise.all(deletePromises);
        console.log('Cleanup completed successfully.');
    } catch (error) {
        console.error('Error during schedule cleanup:', error);
    }
};
