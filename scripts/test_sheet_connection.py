import os
import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SERVICE_ACCOUNT_FILE = 'service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'
# Target GID for "Program Update" tab as per GlobalSettingsContext
TARGET_GID = '464998222' 

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Error: {SERVICE_ACCOUNT_FILE} not found.")
        return

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    try:
        service = build('sheets', 'v4', credentials=creds)
        sheet = service.spreadsheets()
        
        # 1. Get sheet title for the GID
        spreadsheet = sheet.get(spreadsheetId=SPREADSHEET_ID).execute()
        sheet_title = None
        for s in spreadsheet.get('sheets', []):
            if str(s.get('properties', {}).get('sheetId')) == TARGET_GID:
                sheet_title = s.get('properties', {}).get('title')
                break
        
        if not sheet_title:
            print(f"Error: Could not find sheet with GID {TARGET_GID}")
            return

        print(f"Connected to Spreadsheet. Target sheet: {sheet_title}")

        # 2. Append a test row
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        values = [
            ["TEST_CONNECTION", timestamp, "Agent Diagnostic", "SUCCESS", "Writing from SriBagavathDevClean"]
        ]
        body = {
            'values': values
        }
        
        result = sheet.values().append(
            spreadsheetId=SPREADSHEET_ID,
            range=f"'{sheet_title}'!A:E",
            valueInputOption='USER_ENTERED',
            body=body
        ).execute()

        print(f"Success! {result.get('updates').get('updatedCells')} cells updated.")
        print(f"Test row appended to {sheet_title} at {timestamp}")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    main()
