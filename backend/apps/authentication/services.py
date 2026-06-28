import requests
from urllib.parse import urlencode

from django.conf import settings


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

def build_google_auth_url():

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile https://www.googleapis.com/auth/gmail.modify",
        "access_type": "offline",
        "prompt": "consent",
    }

    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"

def exchange_code_for_token(code):
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = requests.post(GOOGLE_TOKEN_URL, data=data)

    response.raise_for_status()

    return response.json()

def get_google_user(access_token):

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    response = requests.get(
        GOOGLE_USERINFO_URL,
        headers=headers
    )

    response.raise_for_status()

    return response.json()