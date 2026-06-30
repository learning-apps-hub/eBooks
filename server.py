#!/usr/bin/env python3
"""
Emily Book Series — HTTPS server on port 8082.
HTTPS is required for Web Speech API (TTS) to work over the local network.
A self-signed certificate is generated automatically on first run.
"""
import http.server
import ssl
import os
import subprocess
import sys

PORT = 8082
CERT = os.path.join(os.path.dirname(__file__), 'cert.pem')
KEY  = os.path.join(os.path.dirname(__file__), 'key.pem')

# Change to app directory so files are served from the right root
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def gen_cert():
    print("Generating self-signed certificate...")
    subprocess.run([
        'openssl', 'req', '-new', '-x509',
        '-keyout', KEY, '-out', CERT,
        '-days', '3650', '-nodes',
        '-subj', '/CN=emily-books/O=Emily'
    ], check=True, capture_output=True)
    print("Certificate created.")

if not os.path.exists(CERT):
    gen_cert()

handler = http.server.SimpleHTTPRequestHandler

class QuietHandler(handler):
    def log_message(self, fmt, *args):
        pass  # suppress per-request logs

httpd = http.server.HTTPServer(('0.0.0.0', PORT), QuietHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain(CERT, KEY)
httpd.socket = ctx.wrap_socket(httpd.socket, server_side=True)

print(f"\n📚 Emily's Book Series running!")
print(f"   Open on your phone/Mac (accept the security warning once):")
print(f"   https://10.0.20.52:{PORT}")
print(f"\n   Press Ctrl+C to stop.\n")

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
    sys.exit(0)
