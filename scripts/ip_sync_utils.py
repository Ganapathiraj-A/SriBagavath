import socket
import firebase_admin
from firebase_admin import credentials, firestore
import os

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def sync_ip_to_firestore(service_account_path, project_id='sri-bagavath-dev'):
    if not os.path.exists(service_account_path):
        print(f"Error: {service_account_path} not found. Cannot sync IP.")
        return False
        
    current_ip = get_ip()
    server_url = f"http://{current_ip}:8080"
    
    print(f"Syncing IP to Firestore: {server_url}")
    
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {'projectId': project_id})
            
        db = firestore.client()
        doc_ref = db.collection('settings').document('global')
        doc_ref.set({
            'serverUrl': server_url,
            'lastIpSync': firestore.SERVER_TIMESTAMP
        }, merge=True)
        print(f"✅ Successfully synced IP {current_ip} to Firestore.")
        return True
    except Exception as e:
        print(f"❌ Failed to sync IP: {e}")
        return False
