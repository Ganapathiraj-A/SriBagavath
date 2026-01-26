import http.server
import socketserver
import os
import json
import socket
import shutil
import time
from datetime import datetime

PORT = 8080

def get_all_ips():
    ips = []
    try:
        # Get all interfaces and their IPs
        # This works on most Linux systems
        import subprocess
        output = subprocess.check_output(['hostname', '-I']).decode()
        ips = [ip for ip in output.split() if ip.startswith('192.') or ip.startswith('172.') or ip.startswith('10.')]
    except Exception:
        pass
    
    if not ips:
        # Fallback to single detection
        ips = [get_ip()]
    return list(set(ips))

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Use Google's public DNS to find the interface used for internet access
        s.connect(('8.8.8.8', 80))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def discover_apks():
    """Finds all APKs in scripts, project root, and CWD."""
    apks = []
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    search_dirs = [script_dir, project_root, os.getcwd()]
    seen_apks = set()
    found_info = []

    for d in search_dirs:
        if not os.path.exists(d): continue
        for f in os.listdir(d):
            if f.endswith('.apk') and f not in seen_apks:
                path = os.path.join(d, f)
                stats = os.stat(path)
                seen_apks.add(f)
                apks.append({
                    "name": f,
                    "size": stats.st_size,
                    "modified": datetime.fromtimestamp(stats.st_mtime).isoformat() + "Z",
                    "full_path": path
                })
                found_info.append(f)
    if found_info:
        print(f"--- Found {len(found_info)} APKs: {', '.join(found_info)}")
    return apks

class ApkHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] GET {self.path} from {self.client_address[0]}")
        if self.path == '/manifest.json':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            apks = []
            # Try to find a real local IP for the manifest URLs
            local_ip = "localhost"
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                local_ip = s.getsockname()[0]
                s.close()
            except:
                pass

            # Refresh discovery on manifest request
            apks_data = discover_apks()
            self.server.apk_paths = {apk['name']: apk['full_path'] for apk in apks_data}
            
            # Format for JSON response with local IP
            # Try to get version from package.json
            version = "unknown"
            try:
                pkg_path = os.path.join(project_root, 'package.json')
                with open(pkg_path, 'r') as f:
                    pkg = json.load(f)
                    version = pkg.get('version', 'unknown')
            except:
                pass

            apks = []
            for apk in apks_data:
                apks.append({
                    "name": apk["name"],
                    "version": version if "sribagavath" in apk["name"].lower() else "unknown",
                    "size": apk["size"],
                    "modified": apk["modified"],
                    "url": f"http://{local_ip}:{PORT}/{apk['name']}"
                })
            
            manifest = {
                "server": "SriBagavath-ApkServer",
                "ip": get_ip(),
                "timestamp": datetime.now().isoformat() + "Z",
                "apks": apks
            }
            self.wfile.write(json.dumps(manifest, indent=4).encode())
        elif self.path.startswith('/') and self.path[1:] in getattr(self.server, 'apk_paths', {}):
            # Special handling for APKs found in other directories
            apk_name = self.path[1:]
            full_path = self.server.apk_paths[apk_name]
            size = os.path.getsize(full_path)
            
            # Handle Range Header (Resume / Parallel Downloads)
            range_header = self.headers.get('Range')
            start, end = 0, size - 1
            status_code = 200
            
            if range_header and range_header.startswith('bytes='):
                try:
                    ranges = range_header.replace('bytes=', '').split('-')
                    start = int(ranges[0]) if ranges[0] else 0
                    end = int(ranges[1]) if ranges[1] else size - 1
                    status_code = 206
                except ValueError:
                    pass
            
            # Clamp end
            if end >= size: end = size - 1
            
            content_length = end - start + 1
            
            self.send_response(status_code)
            self.send_header('Content-type', 'application/vnd.android.package-archive')
            self.send_header('Content-length', content_length)
            self.send_header('Accept-Ranges', 'bytes')
            if status_code == 206:
                self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            start_time = time.time()
            try:
                with open(full_path, 'rb') as f:
                    # Seek to start of range
                    f.seek(start)
                    
                    # Try to use zero-copy sendfile for maximum performance
                    if hasattr(os, 'sendfile'):
                        fd = f.fileno()
                        offset = start # sendfile uses explicit offset, doesn't rely on seek
                        remaining = content_length
                        
                        while remaining > 0:
                            # Send in chunks of up to 10MB to avoid monopolizing kernel
                            block_size = min(remaining, 10 * 1024 * 1024)
                            sent = os.sendfile(self.wfile.fileno(), fd, offset, block_size)
                            if sent == 0: break # Connection closed
                            offset += sent
                            remaining -= sent
                    else:
                        # Fallback to chunked copy
                        # Limit read to content_length
                        remaining = content_length
                        while remaining > 0:
                            chunk_size = min(remaining, 1024 * 1024)
                            data = f.read(chunk_size)
                            if not data: break
                            self.wfile.write(data)
                            remaining -= len(data)
                
                duration = time.time() - start_time
                speed = (content_length / (1024 * 1024)) / duration if duration > 0 else 0
                print(f"[{datetime.now().strftime('%H:%M:%S')}] OK {status_code}: {apk_name} ({content_length/1024/1024:.1f} MB) in {duration:.1f}s at {speed:.1f} MB/s")
            except (ConnectionResetError, BrokenPipeError):
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Aborted: {apk_name} (Client disconnected)")
            except Exception as e:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {e}")
        else:
            # Standard file serving with CORS for convenience
            super().do_GET()

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

import subprocess

def check_firewall():
    try:
        # Check if ufw is active
        status = subprocess.check_output(['sudo', 'ufw', 'status'], stderr=subprocess.STDOUT).decode()
        if "Status: active" in status:
            if str(PORT) not in status:
                print(f"!!! WARNING: UFW Firewall is ACTIVE but port {PORT} is NOT allowed.")
                print(f"!!! Run: sudo ufw allow {PORT}")
            else:
                print(f"--- UFW Firewall is active and port {PORT} is allowed.")
    except Exception:
        # UFW might not be installed or sudo failed
        pass

if __name__ == "__main__":
    primary_ip = get_ip()
    all_ips = get_all_ips()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] starting APK Server...")
    print(f"--- Primary IP (Guess): {primary_ip}")
    if len(all_ips) > 1:
        print(f"--- All Available IPs: {', '.join(all_ips)}")
    
    print(f"\nManifest available at: http://{primary_ip}:{PORT}/manifest.json")
    print("If the phone can't connect, try one of the other IPs listed above.")
    print("Serving APKs in current directory and parent...")
    check_firewall()

    # Use ThreadingTCPServer to avoid blocking and improve throughput
    class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
        # Ensure we can reuse the port immediately after restart
        allow_reuse_address = True
        daemon_threads = True
        
        def server_bind(self):
            super().server_bind()
            try:
                # 1. Enable TCP_NODELAY to disable Nagle's algorithm (lower latency)
                self.socket.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
                
                # 2. Increase Send Buffer to 8MB (better for high-latency/high-bandwidth WiFi)
                # Standard is often 128KB - 256KB.
                self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF, 8 * 1024 * 1024)
                
                buf_size = self.socket.getsockopt(socket.SOL_SOCKET, socket.SO_SNDBUF)
                print(f"--- Optimized TCP: NODELAY=1, SNDBUF={buf_size//1024} KB")
            except Exception as e:
                print(f"--- TCP Optimization warning: {e}")

    with ThreadedTCPServer(("", PORT), ApkHandler) as httpd:
        # Initial discovery so APKs can be served even without a fresh manifest hit
        apks_data = discover_apks()
        httpd.apk_paths = {apk['name']: apk['full_path'] for apk in apks_data}
        httpd.serve_forever()
