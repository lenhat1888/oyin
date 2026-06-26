# cron.py
import requests
import os
import sys
from datetime import datetime

APP_URL = os.environ.get('APP_URL', 'https://oyin-website.onrender.com')

def ping():
    try:
        response = requests.get(APP_URL, timeout=30)
        print(f"✅ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Ping successful: {response.status_code}")
        return True
    except requests.exceptions.Timeout:
        print(f"⏰ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Ping timeout")
        return False
    except Exception as e:
        print(f"❌ [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Ping failed: {e}")
        return False

if __name__ == '__main__':
    success = ping()
    sys.exit(0 if success else 1)