export const GET_GOOGLE_CLIENT_ID = () => {
    const DEV_ID = "265576571338-82ulk332k7gao9h5e8ihnrj85nkir22a.apps.googleusercontent.com";
    const PROD_ID = "358075696780-qufnh6jj5vl6bn3hogihp5uficngu4in.apps.googleusercontent.com";

    // Check vite env project id
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (projectId === 'sri-bagavath-dev') return DEV_ID;
    return PROD_ID;
};
