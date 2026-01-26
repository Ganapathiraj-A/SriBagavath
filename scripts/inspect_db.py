import firebase_admin
from firebase_admin import credentials, firestore
import os

SERVICE_ACCOUNT_FILE = 'service-account.json'

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Error: {SERVICE_ACCOUNT_FILE} missing")
        return
    
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    print("Checking 'transactions' collection...")
    # Just get anything
    docs = db.collection('transactions').limit(10).get()
    print(f"Found {len(docs)} documents in 'transactions'")
    
    for doc in docs:
        data = doc.to_dict()
        print(f"ID: {doc.id}")
        print(f" - itemType: {data.get('itemType')}")
        print(f" - itemName: {data.get('itemName')}")
        print(f" - programId: {data.get('programId')}")
        print("-" * 20)

if __name__ == "__main__":
    main()
