from flask import Flask, request, jsonify, session
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
from chatbot import get_response
from werkzeug.security import generate_password_hash, check_password_hash
import uuid

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key')
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600

# CORS configuration - remove trailing slash!
CORS(
    app,
    supports_credentials=True,
    origins=["https://crick-genius-babam7l6j-abhinav-pandeys-projects-e2b49309.vercel.app"]
)

@app.after_request
def add_security_headers(resp):
    resp.headers['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
    resp.headers['Cross-Origin-Resource-Policy'] = 'cross-origin'
    return resp

def init_db():
    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        c.execute('DROP TABLE IF EXISTS users')
        c.execute('''CREATE TABLE users
                     (username TEXT PRIMARY KEY, password TEXT)''')
        c.execute('DROP TABLE IF EXISTS chats')
        c.execute('''CREATE TABLE chats
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      username TEXT,
                      conversation_id TEXT,
                      query TEXT,
                      response TEXT,
                      timestamp TEXT)''')
        conn.commit()

init_db()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password must be non-empty'}), 400

    hashed_pw = generate_password_hash(password)
    try:
        with sqlite3.connect('database.db') as conn:
            c = conn.cursor()
            c.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_pw))
            conn.commit()
        session['username'] = username
        session.permanent = True
        return jsonify({'username': username}), 200
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({'error': 'Username and password must be non-empty'}), 400

    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        c.execute('SELECT password FROM users WHERE username = ?', (username,))
        row = c.fetchone()

    if row and check_password_hash(row[0], password):
        session['username'] = username
        session.permanent = True
        return jsonify({'username': username}), 200
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    return jsonify({'message': 'Logged out'}), 200

@app.route('/new_chat', methods=['POST'])
def new_chat():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    username = session['username']
    conversation_id = str(uuid.uuid4())

    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        c.execute('''
            SELECT conversation_id FROM chats
            WHERE username = ? AND query IS NULL
            ORDER BY timestamp DESC LIMIT 1
        ''', (username,))
        existing = c.fetchone()

    if existing:
        return jsonify({'conversation_id': existing[0]}), 200

    return jsonify({'conversation_id': conversation_id}), 200

@app.route('/chat', methods=['POST'])
def chat():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    query = data.get('query')
    username = session['username']
    conversation_id = request.cookies.get('conversation_id') or str(uuid.uuid4())

    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        c.execute('''
            SELECT query, response
            FROM chats
            WHERE username = ? AND conversation_id = ? AND query IS NOT NULL
            ORDER BY timestamp ASC
        ''', (username, conversation_id))
        rows = c.fetchall()

    history = []
    for row in rows:
        q, r = row
        history.append({"role": "user", "content": q})
        history.append({"role": "assistant", "content": r})

    response_text = get_response(query, history=history)

    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        timestamp = datetime.now().isoformat()
        c.execute('''
            INSERT INTO chats (username, conversation_id, query, response, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, conversation_id, query, response_text, timestamp))
        conn.commit()

    resp = jsonify({
        'response': response_text,
        'conversation_id': conversation_id
    })
    resp.set_cookie('conversation_id', conversation_id, samesite='None', secure=True)
    return resp, 200

@app.route('/chat_history', methods=['GET'])
def chat_history():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    username = session['username']
    with sqlite3.connect('database.db') as conn:
        c = conn.cursor()
        c.execute('''
            SELECT conversation_id, query, response, timestamp
            FROM chats
            WHERE username = ?
            ORDER BY timestamp DESC
        ''', (username,))
        rows = c.fetchall()

    conversations = {}
    for row in rows:
        conv_id, query, response, timestamp = row
        if conv_id not in conversations:
            conversations[conv_id] = {
                'id': conv_id,
                'first_query': query or 'New Chat',
                'messages': []
            }
        if query and response:
            conversations[conv_id]['messages'].append({
                'query': query,
                'response': response,
                'timestamp': timestamp
            })

    valid_conversations = [
        conv for conv in conversations.values()
        if conv['messages'] or conv['first_query'] != 'New Chat'
    ]
    return jsonify({'conversations': valid_conversations}), 200
    
@app.route('/profile', methods=['GET'])
def profile():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    return jsonify({'username': session['username']}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
