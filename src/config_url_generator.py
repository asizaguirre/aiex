```python src/config_url_generator.py
import os

def generate_fixed_url():
    # Get the ngrok subdomain
    ngrok_subdomain = os.environ.get('NGROK_SUBDOMAIN')
    
    if ngrok_subdomain:
        return f"https://{ngrok_subdomain}.ngrok.io"
    else:
        return "ngrok_subdomain_not_set"

FIXED_URL = generate_fixed_url()
print(FIXED_URL)