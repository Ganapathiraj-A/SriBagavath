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

# GID Mappings found from actual metadata
EXPECTED_GIDS = {
    "PROGRAM_IMPORT": "0",
    "BOOK_IMPORT": "106820319",
    "DONATION_IMPORT": "314638099",
    "PROGRAM_UPDATE": "464998222",
    "BOOK_UPDATE": "1377614208",
    "DONATION_UPDATE": "1623097087"
}

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def init_clients():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise FileNotFoundError(f"{SERVICE_ACCOUNT_FILE} missing")
    
    # Firebase
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    # Sheet Token
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets'])
    creds.refresh(Request())
    
    return db, creds.token

def test_sheet_topology():
    log("Verifying Sheet Topology...")
    _, token = init_clients()
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}"
    headers = {"Authorization": f"Bearer {token}"}
    
    res = requests.get(url, headers=headers, timeout=60)
    if res.status_code != 200:
        log(f"Failed to fetch metadata: {res.text}")
        return False
    
    sheets = res.json().get('sheets', [])
    found_gids = {str(s['properties']['sheetId']): s['properties']['title'] for s in sheets}
    
    all_ok = True
    for key, expected_gid in EXPECTED_GIDS.items():
        if expected_gid in found_gids:
            log(f"✅ {key}: GID {expected_gid} matches '{found_gids[expected_gid]}'")
        else:
            log(f"❌ {key}: GID {expected_gid} NOT FOUND in spreadsheet")
            all_ok = False
            
    return all_ok

def test_firestore_samples():
    log("Verifying Firestore Samples...")
    db, _ = init_clients()
    for item_type in ['PROGRAM', 'BOOK', 'DONATION']:
        docs = db.collection('transactions').where('itemType', '==', item_type).limit(1).get()
        if len(docs) > 0:
            log(f"✅ Firestore: Found sample for {item_type}")
        else:
            log(f"⚠️ Firestore: No records found for {item_type} (might be empty but ok)")
    return True

if __name__ == "__main__":
    try:
        log("Starting Sync Unit Test Suite...")
        if test_sheet_topology() and test_firestore_samples():
            log("\nUNIT TESTS PASSED: Configuration matches Environment.")
        else:
            log("\nUNIT TESTS FAILED: Mismatches detected.")
    except Exception as e:
        log(f"Error during tests: {e}")
