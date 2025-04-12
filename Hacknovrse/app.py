from flask import Flask, redirect, request, session, url_for, render_template
from google_auth_oauthlib.flow import Flow
import os
import requests

app = Flask(__name__)
app.secret_key = 'your_secret_key'
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"  

SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/user.birthday.read',
    'openid'
]

flow = Flow.from_client_secrets_file(
    'client_secret.json',
    scopes=SCOPES,
    redirect_uri='http://localhost:5000/callback'
)

@app.route('/')
def index():
    return render_template('index.html')  # Contains Google Sign-In button

@app.route('/login')
def login():
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    session['state'] = state
    return redirect(authorization_url)

@app.route('/callback')
def callback():
    flow.fetch_token(authorization_response=request.url)

    if session['state'] != request.args['state']:
        return "State mismatch", 400

    credentials = flow.credentials
    session['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    # Get user info
    user_info = requests.get(
        'https://www.googleapis.com/oauth2/v1/userinfo',
        params={'access_token': credentials.token}
    ).json()

    return f"Hello, {user_info.get('name', 'User')}!"

if __name__ == '__main__':
    app.run(debug=True)
