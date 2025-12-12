# Firebase Setup Instructions

## Setting up Firebase for the Antigravity App

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

### Step 2: Register Your Web App

1. In the Firebase Console, click on the "Web" icon (</>) to add a web app
2. Register your app with a nickname (e.g., "Antigravity App")
3. Firebase will generate a configuration object

### Step 3: Get Your Firebase Configuration

Copy the Firebase configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### Step 4: Update the Firebase Configuration File

1. Open `src/firebase.js` in your project
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",           // Replace with your actual API key
  authDomain: "YOUR_AUTH_DOMAIN",   // Replace with your actual auth domain
  projectId: "YOUR_PROJECT_ID",     // Replace with your actual project ID
  storageBucket: "YOUR_STORAGE_BUCKET",  // Replace with your actual storage bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // Replace with your actual sender ID
  appId: "YOUR_APP_ID"              // Replace with your actual app ID
};
```

### Step 5: Enable Firestore Database

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (or "production mode" for production)
4. Select a Cloud Firestore location (choose the one closest to your users)
5. Click "Enable"

### Step 6: Set Up Firestore Security Rules (Optional but Recommended)

For development, you can use test mode rules. For production, update your Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /programs/{document=**} {
      allow read: if true;  // Anyone can read programs
      allow write: if request.auth != null;  // Only authenticated users can write
    }
  }
}
```

### Step 7: Test the Connection

1. Start your development server: `npm run dev`
2. Navigate to Configuration > Program
3. Try adding a test program
4. Check the Firestore Database in Firebase Console to see if the data was saved

## Firestore Data Structure

The app uses a collection called `programs` with the following structure:

```javascript
{
  programName: string,           // One of: "Gnana Muham", "Gnana Viduthalai Muham", "Dhyana Muham", "Ayya's Birthday"
  programDate: string,           // ISO date string
  programEndDate: string,        // ISO date string (Optional)
  programDescription: string,    // HTML/Text content (Optional)
  programCity: string,           // City name
  programVenue: string,          // Venue address
  registrationStatus: string,    // "Open" or "Closed"
  lastDateToRegister: string,    // ISO date string
  createdAt: string             // ISO timestamp
}
```

## Troubleshooting

### Error: "Firebase not configured"
- Make sure you've replaced all placeholder values in `src/firebase.js`
- Check that your Firebase project is active

### Error: "Permission denied"
- Check your Firestore security rules
- Make sure you're in test mode or have proper authentication set up

### Error: "Collection not found"
- The collection will be created automatically when you add your first program
- No manual setup needed

## Next Steps

After Firebase is configured:
1. The Program Management page will work fully
2. You can add, edit, and delete programs
3. Data will persist in Firestore
4. Programs will be displayed on the Upcoming Programs page

For production deployment, remember to:
- Update Firestore security rules
- Set up Firebase Authentication if needed
- Enable appropriate Firebase services
