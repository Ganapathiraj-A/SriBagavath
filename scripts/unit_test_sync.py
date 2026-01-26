import os
import requests
import time
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Configuration
SERVICE_ACCOUNT_FILE = 'service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'

# Mapping categories to their specific update tabs (GIDs)
CATEGORIES = {
    "PROGRAM": "186682100",
    "BOOK": "918205091",
    "DONATION": "1623097087"
}

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def init_clients():
    # Firebase
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Sheets
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets'])
    creds.refresh(Request())
    return db, creds.token

def test_category_sync(category, gid):
    log(f"--- Testing {category} (GID: {gid}) ---")
    db, token = init_clients()
    
    # 1. Fetch sample from Firestore
    # We try with itemType, fallback to first doc in collection if needed
    docs = db.collection('transactions').where('itemType', '==', category).limit(1).get()
    if not docs:
        docs = db.collection('transactions').limit(1).get() # Fallback for legacy
        
    if not docs:
        log(f"SKIPPING {category}: No data found in Firestore transactions.")
        return False
        
    doc = docs[0]
    data = doc.to_dict()
    log(f"Found sample doc: {doc.id}")

    # 2. Format a 12-column row (Padded)
    # App headers: RegID, Date, Name, Mobile, Amount, ...
    row = [
        doc.id, 
        str(data.get('timestamp') or 'N/A'),
        data.get('primaryApplicant', {}).get('name') or data.get('itemName') or 'UNIT_TEST_USER',
        data.get('primaryApplicant', {}).get('mobile') or '0000000000',
        str(data.get('amount') or 0),
        data.get('place') or '',
        '', '', '', '', '', '' # Padded to 12
    ]
    
    # 3. Push to Sheet (Direct API call to test connectivity)
    log(f"Pushing test row to sheet GID {gid}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # First, get the sheet name for the GID
    url_meta = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}"
    res_meta = requests.get(url_meta, headers=headers, timeout=60).json()
    sheet_name = None
    for s in res_meta.get('sheets', []):
        if str(s['properties']['sheetId']) == gid:
            sheet_name = s['properties']['title']
            break
            
    if not sheet_name:
        log(f"Error: GID {gid} not found in spreadsheet.")
        return False

    # Append the row
    url_append = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/'{sheet_name}'!A:L:append"
    params = {"valueInputOption": "USER_ENTERED"}
    body = {"values": [row]}
    
    res = requests.post(url_append, headers=headers, json=body, params=params, timeout=60)
    if res.status_code == 200:
        log(f"✅ Success: Data appended to '{sheet_name}'")
        return True
    else:
        log(f"❌ Failed to push data: {res.text}")
        return False

def main():
    try:
        log("Starting Comprehensive Sync Unit Tests...")
        results = []
        for cat, gid in CATEGORIES.items():
            results.append(test_category_sync(cat, gid))
            
        if all(results):
            log("\nALL SYNC TESTS COMPLETED SUCCESSFULLY.")
        else:
            log("\nSYNC TESTS FINISHED WITH ERRORS.")
            
    except Exception as e:
        log(f"Unit Test Suite Error: {e}")

if __name__ == "__main__":
    main()
