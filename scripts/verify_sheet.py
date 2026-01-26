import os
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
SERVICE_ACCOUNT_FILE = '/home/ganapathiraj/Code/AndroidDevelopment/AgentCompanion/service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Error: Service account file not found at {SERVICE_ACCOUNT_FILE}")
        return

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)

    try:
        service = build('sheets', 'v4', credentials=creds)
        
        # Call the Sheets API
        sheet = service.spreadsheets()
        result = sheet.get(spreadsheetId=SPREADSHEET_ID).execute()
        
        print(f"Spreadsheet Title: {result.get('properties', {}).get('title')}")
        print("\nSheets in this spreadsheet:")
        for s in result.get('sheets', []):
            props = s.get('properties', {})
            print(f"- {props.get('title')} (GID: {props.get('sheetId')})")
            
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    main()
