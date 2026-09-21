#!/usr/bin/env python3
"""
Local Development Server with Clean URL Support
Mimics Apache's mod_rewrite behavior for testing cPanel deployment locally
"""

import os
import sys
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, unquote

class CleanURLHandler(SimpleHTTPRequestHandler):
    """
    Custom HTTP handler that supports clean URLs (without .html extension)
    Mimics the .htaccess rewrite rules used in cPanel deployment
    """

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        parsed_path = urlparse(self.path)
        path = unquote(parsed_path.path)

        if path == '/api/typesafe-query':
            try:
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)
                payload = json.loads(body.decode('utf-8'))
                query_text = payload.get('query', '')

                scripts_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts')
                if scripts_dir not in sys.path:
                    sys.path.insert(0, scripts_dir)
                from typesafe_service import resolve_query
                result = resolve_query(query_text)

                resp_bytes = json.dumps(result, ensure_ascii=False).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(resp_bytes)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(resp_bytes)
                return
            except Exception as e:
                err_resp = json.dumps({'success': False, 'error': str(e)}).encode('utf-8')
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(err_resp)))
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(err_resp)
                return

        return super().do_POST()

    def do_GET(self):
        # Parse the URL path
        parsed_path = urlparse(self.path)
        path = unquote(parsed_path.path)

        # Remove trailing slash for non-root paths
        if path != '/' and path.endswith('/'):
            # Check if this is a directory with index.html
            dir_path = '.' + path
            index_path = dir_path + 'index.html'
            if os.path.isdir(dir_path) and os.path.isfile(index_path):
                # Serve index.html from directory
                return super().do_GET()

        # Try to serve the file directly first
        file_path = '.' + path

        # If path doesn't have extension and file doesn't exist
        if not os.path.exists(file_path) and not path.endswith('/'):
            # Try adding .html extension
            html_path = file_path + '.html'
            if os.path.isfile(html_path):
                # Internally rewrite to serve the .html file
                self.path = path + '.html'
                if parsed_path.query:
                    self.path += '?' + parsed_path.query
                return super().do_GET()

        # If it's a directory, try index.html
        if os.path.isdir(file_path):
            index_path = os.path.join(file_path, 'index.html')
            if os.path.isfile(index_path):
                self.path = path.rstrip('/') + '/index.html'
                if parsed_path.query:
                    self.path += '?' + parsed_path.query
                return super().do_GET()

        # Fall back to default behavior
        return super().do_GET()

    def send_error(self, code, message=None, explain=None):
        """
        Serve the site's own error page instead of Python's built-in one.

        Apache has `ErrorDocument 404 /404.html`, so in production a missing
        page renders the styled 404. Without this the local server would show
        a bare "Error response / Error code: 404 / File not found." - a
        completely different page, which makes "is this broken?" impossible to
        answer from the preview. Matches the deployed behaviour instead.
        """
        if code == 404 and getattr(self, 'path', '').split('?')[0] != '/404.html':
            error_page = os.path.join(os.getcwd(), '404.html')
            if os.path.isfile(error_page):
                with open(error_page, 'rb') as handle:
                    body = handle.read()
                self.send_response(404)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(body)
                return
        return super().send_error(code, message, explain)

    def log_message(self, format, *args):
        # Custom logging with color for clean URL rewrites
        message = format % args
        if '.html' not in getattr(self, 'path', '') and 'GET' in message:
            # This was a clean URL that got rewritten
            print(f"\033[0;32m{self.address_string()}\033[0m - {message}")
        else:
            print(f"{self.address_string()} - {message}")

def run_server(port=8888, directory='dist'):
    """Run the development server with clean URL support"""

    # Change to the specified directory
    if directory != '.':
        if not os.path.isdir(directory):
            print(f"Error: Directory '{directory}' not found")
            sys.exit(1)
        os.chdir(directory)

    server_address = ('', port)
    httpd = HTTPServer(server_address, CleanURLHandler)

    print("=" * 60)
    print("Clean URL Development Server")
    print("=" * 60)
    print(f"Serving from: {os.getcwd()}")
    print(f"Server running at: http://localhost:{port}")
    print()
    print("Clean URLs supported:")
    print("  /services/certificates  →  serves certificates.html")
    print("  /legislative/resolution-framework  →  serves resolution-framework.html")
    print()
    print("Why not `python3 -m http.server`? That has no rewrite step, so every")
    print("clean URL on this site 404s. The .htaccess rules deployed to cPanel")
    print("are emulated here; use this server so the preview matches production.")
    print()
    print("Press Ctrl+C to stop")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Local server with clean URL support')
    parser.add_argument('-p', '--port', type=int, default=8888, help='Port number (default: 8888)')
    parser.add_argument('-d', '--directory', type=str, default='dist', help='Directory to serve (default: dist)')
    args = parser.parse_args()

    run_server(port=args.port, directory=args.directory)
