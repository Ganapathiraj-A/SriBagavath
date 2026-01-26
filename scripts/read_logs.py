import os
import requests
import time
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SERVICE_ACCOUNT_FILE = 'service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'
LOGS_GID = '45016497'

def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}")

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        log(f"Error: {SERVICE_ACCOUNT_FILE} not found.")
        return

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=['https://www.googleapis.com/auth/spreadsheets'])
    creds.refresh(Request())
    token = creds.token
    
    # We need the sheet name for ScriptLogs
    url_meta = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}"
    headers = {"Authorization": f"Bearer {token}"}
    res_meta = requests.get(url_meta, headers=headers, timeout=60).json()
    
    log_sheet_name = None
    for s in res_meta.get('sheets', []):
        if str(s['properties']['sheetId']) == LOGS_GID:
            log_sheet_name = s['properties']['title']
            break
            
    if not log_sheet_name:
        log("Could not find ScriptLogs sheet name")
        return

    log(f"Reading last 5 rows from {log_sheet_name}...")
    url_data = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/'{log_sheet_name}'!A:E"
    res_data = requests.get(url_data, headers=headers, timeout=60).json()
    
    values = res_data.get('values', [])
    if not values:
        log("No logs found.")
        return
        
    for row in values[-5:]:
        print(f"LOG: {row}")

if __name__ == '__main__':
    main()
