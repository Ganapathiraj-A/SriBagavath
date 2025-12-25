import { analytics } from '../firebase';
import { logEvent } from 'firebase/analytics';

const Analytics = {
    async logEvent(eventName, eventParams = {}) {
        try {
            const instance = await analytics;
            if (instance) {
                logEvent(instance, eventName, eventParams);
            }
        } catch (error) {
            console.error('Analytics logEvent failed:', error);
        }
    },

    trackScreenView(screenName) {
        this.logEvent('screen_view', {
            firebase_screen: screenName,
            screen_name: screenName
        });
    },

    trackRegistrationStart(programName, programId) {
        this.logEvent('registration_start', {
            program_name: programName,
            program_id: programId
        });
    },

    trackRegistrationSuccess(programName, programId) {
        this.logEvent('registration_success', {
            program_name: programName,
            program_id: programId
        });
    },

    trackPaymentInitiated(method, amount) {
        this.logEvent('payment_initiated', {
            payment_method: method,
            amount: amount
        });
    },

    trackPaymentSuccess(amount, programId) {
        this.logEvent('payment_success', {
            amount: amount,
            program_id: programId
        });
    }
};

export default Analytics;
