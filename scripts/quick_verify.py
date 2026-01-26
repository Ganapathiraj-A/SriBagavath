import os
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SERVICE_ACCOUNT_FILE = 'service-account.json'
SPREADSHEET_ID = '1TtzVIK28OidQQb2cuuHNqrcuSiUGgM-q28xkJHLyWrs'

def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        print(f"Error: {SERVICE_ACCOUNT_FILE} not found.")
        return

    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, 
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    
    print("Refreshing token...")
    creds.refresh(Request())
    token = creds.token
    print(f"Token acquired. Length: {len(token)}")
    
    print(f"Fetching spreadsheet metadata for {SPREADSHEET_ID}...")
    url = f"https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}"
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(url, headers=headers, timeout=15)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Spreadsheet Title: {data.get('properties', {}).get('title')}")
    else:
        print(f"Failed with status code {response.status_code}")
        print(response.text)

if __name__ == '__main__':
    main()
