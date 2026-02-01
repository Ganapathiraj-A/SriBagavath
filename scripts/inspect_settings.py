import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate('/home/ganapathiraj/Code/AndroidDevelopment/AgentCompanion/service-account.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

doc_ref = db.collection('settings').document('global')
doc = doc_ref.get()
if doc.exists:
    print(f"Settings: {doc.to_dict()}")
else:
    print("No global settings found.")
