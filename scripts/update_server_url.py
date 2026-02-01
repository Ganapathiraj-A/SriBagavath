import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('/home/ganapathiraj/Code/AndroidDevelopment/SriBagavathDevClean/sri-bagavath-dev-firebase-adminsdk-fbsvc-b3da295cc2.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

doc_ref = db.collection('settings').document('global')
doc_ref.set({
    'serverUrl': 'http://192.168.1.3:8080'
}, merge=True)

print("Firestore serverUrl updated to http://192.168.1.3:8080")
