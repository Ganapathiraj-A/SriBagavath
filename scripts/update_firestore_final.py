import firebase_admin
from firebase_admin import credentials, firestore
import time

# Use the SPECIFIC service account for the dev project
cert_path = '/home/ganapathiraj/Code/AndroidDevelopment/SriBagavathDevClean/sri-bagavath-dev-firebase-adminsdk-fbsvc-b3da295cc2.json'
print(f"Using cert: {cert_path}")

try:
    cred = credentials.Certificate(cert_path)
    # Explicitly set the project ID to match the cert
    firebase_admin.initialize_app(cred, {
        'projectId': 'sri-bagavath-dev'
    })
    db = firestore.client()
    
    print("Connecting to Firestore...")
    doc_ref = db.collection('settings').document('global')
    
    # Try a simple get first to test connection
    doc = doc_ref.get()
    if doc.exists:
        print(f"Current data: {doc.to_dict()}")
    else:
        print("Document does not exist, will create.")

    print("Updating serverUrl to http://192.168.1.3:8080 ...")
    doc_ref.set({
        'serverUrl': 'http://192.168.1.3:8080'
    }, merge=True)
    
    print("✅ SUCCESS: serverUrl updated in Firestore.")

except Exception as e:
    print(f"❌ FAILED: {str(e)}")

