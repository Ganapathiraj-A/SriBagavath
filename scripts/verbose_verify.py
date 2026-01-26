import os
import requests
import time
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SERVICE_ACCOUNT_FILE = 'service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        log(f"Error: {SERVICE_ACCOUNT_FILE} not found.")
        return

    log("Loading credentials...")
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    
    log("Refreshing token (Auth step)...")
    try:
        creds.refresh(Request())
        token = creds.token
        log(f"Token acquired. Length: {len(token)}")
    except Exception as e:
        log(f"Auth failed: {e}")
        return
    
    log(f"Pinging google.com to check connectivity...")
    try:
        r = requests.get("https://www.google.com", timeout=5)
        log(f"Google Ping: {r.status_code}")
    except Exception as e:
        log(f"Google Ping failed: {e}")

    log(f"Fetching spreadsheet metadata for {SPREADSHEET_ID} (API step)...")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        start = time.time()
        response = requests.get(url, headers=headers, timeout=20)
        duration = time.time() - start
        log(f"API Call finished in {duration:.2f}s")
        
        if response.status_code == 200:
            data = response.json()
            log(f"Success! Spreadsheet Title: {data.get('properties', {}).get('title')}")
            for s in data.get('sheets', []):
                p = s.get('properties', {})
                log(f" - Found Sheet: {p.get('title')} (GID: {p.get('sheetId')})")
        else:
            log(f"Failed with status code {response.status_code}")
            log(f"Response: {response.text}")
    except requests.exceptions.Timeout:
        log("API Call TIMED OUT after 20s")
    except Exception as e:
        log(f"API Call error: {e}")

if __name__ == '__main__':
    main()
