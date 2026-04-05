import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const TEST_EMAIL = 'smoke-test-admin@example.com';
const TEST_PASSWORD = 'SmokeTest123!';

async function setup() {
  try {
    let user;
    try {
      user = await auth.getUserByEmail(TEST_EMAIL);
      console.log('User already exists:', user.uid);
      // Update password to ensure it matches our expectation
      await auth.updateUser(user.uid, { password: TEST_PASSWORD });
      console.log('Password updated for:', TEST_EMAIL);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        user = await auth.createUser({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          displayName: 'Smoke Test Admin'
        });
        console.log('User created:', user.uid);
      } else {
        throw error;
      }
    }

    // Add to admins collection with SUPER_ADMIN role
    await db.collection('admins').doc(user.uid).set({
      email: TEST_EMAIL,
      role: 'SUPER_ADMIN',
      permissions: ['ALL'],
      isSmokeTest: true
    });
    console.log('Admin record set for:', user.uid);

    console.log('\n--- Test Credentials ---');
    console.log('Email:', TEST_EMAIL);
    console.log('Password:', TEST_PASSWORD);
    console.log('------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();
