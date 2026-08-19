import os
import sys
import webbrowser
from threading import Timer
from app import create_app

def open_browser():
    webbrowser.open_new("http://127.0.0.1:5000/#login")

if __name__ == "__main__":
    # Create the Flask application factory
    app = create_app()
    
    # Spawn the browser 1.5 seconds after Flask starts
    Timer(1.5, open_browser).start()
    
    print("=" * 70)
    print("      LAUNCHING AASTHA'S LIBRARY MANAGEMENT SYSTEM (MVVM ARCHITECTURE)")
    print("=" * 70)
    print("  Local web server initialization... DONE.")
    print("  Database persistence connection... ACTIVE.")
    print("  Web Portal Address: http://127.0.0.1:5000/")
    print("  Press Ctrl+C to terminate the local server session.")
    print("=" * 70)
    
    # Run server locally
    app.run(host="127.0.0.1", port=5000, debug=False)
