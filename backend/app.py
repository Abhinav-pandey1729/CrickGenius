from flask import Flask, request, jsonify, session, Response
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
from chatbot import get_response

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'your-secret-key')
# Session configuration for cross-site requests
app.config['SESSION_COOKIE_SECURE'] = True
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['PERMANENT_SESSION_LIFETIME'] = 3600  # 1 hour
# Allow CORS for the Vercel frontend
CORS(app, supports_credentials=True, origins=["https://crick-genius.vercel.app"])

def init_db():
    conn = sqlite3.connect('database.db')
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
    conn.close()

init_db()

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    print(f"Register request received: {data}")  # Add logging
    username = data.get('username')
    password = data.get('password')

    if not username or not password or not username.strip() or not password.strip():
        print("Validation failed: Username or password empty")
        return jsonify({'error': 'Username and password must be non-empty'}), 400

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    try:
        c.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username.strip(), password.strip()))
        conn.commit()
        session['username'] = username
        session.permanent = True
        print(f"User registered: {username}")
        return jsonify({'username': username}), 200
    except sqlite3.IntegrityError:
        print(f"Registration failed: Username '{username}' already exists")
        return jsonify({'error': 'Username already exists'}), 400
    finally:
        conn.close()

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    print(f"Login request received: {data}")
    username = data.get('username')
    password = data.get('password')

    if not username or not password or not username.strip() or not password.strip():
        print("Validation failed: Username or password empty")
        return jsonify({'error': 'Username and password must be non-empty'}), 400

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username.strip(), password.strip()))
    user = c.fetchone()
    conn.close()

    if user:
        session['username'] = username
        session.permanent = True
        print(f"User logged in: {username}")
        return jsonify({'username': username}), 200
    else:
        print(f"Login failed: Invalid credentials for username '{username}'")
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('username', None)
    print("User logged out")
    return jsonify({'message': 'Logged out'}), 200

@app.route('/new_chat', methods=['POST'])
def new_chat():
    if 'username' not in session:
        print("Unauthorized access to /new_chat")
        return jsonify({'error': 'Unauthorized'}), 401

    username = session['username']
    conversation_id = datetime.now().strftime('%Y%m%d%H%M%S%f')

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        SELECT conversation_id FROM chats
        WHERE username = ? AND query IS NULL
        ORDER BY timestamp DESC LIMIT 1
    ''', (username,))
    existing = c.fetchone()
    conn.close()

    if existing:
        print(f"Returning existing conversation ID: {existing[0]}")
        return jsonify({'conversation_id': existing[0]}), 200

    print(f"New conversation started: {conversation_id}")
    return jsonify({'conversation_id': conversation_id}), 200

@app.route('/chat', methods=['POST'])
def chat():
    if 'username' not in session:
        print("Unauthorized access to /chat")
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    query = data.get('query')
    username = session['username']

    conversation_id = request.cookies.get('conversation_id') or datetime.now().strftime('%Y%m%d%H%M%S%f')

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        SELECT query, response
        FROM chats
        WHERE username = ? AND conversation_id = ? AND query IS NOT NULL
        ORDER BY timestamp ASC
    ''', (username, conversation_id))
    rows = c.fetchall()
    conn.close()

    history = []
    for row in rows:
        query, response = row
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": response})

    response_text = get_response(query, history=history)

    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    timestamp = datetime.now().isoformat()
    c.execute('''
        INSERT INTO chats (username, conversation_id, query, response, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (username, conversation_id, query, response_text, timestamp))
    conn.commit()
    conn.close()

    resp = jsonify({
        'response': response_text,
        'conversation_id': conversation_id
    })
    resp.set_cookie('conversation_id', conversation_id, samesite='None', secure=True)
    print(f"Chat response sent for query: {query}")
    return resp, 200

@app.route('/chat_history', methods=['GET'])
def chat_history():
    if 'username' not in session:
        print("Unauthorized access to /chat_history")
        return jsonify({'error': 'Unauthorized'}), 401

    username = session['username']
    conn = sqlite3.connect('database.db')
    c = conn.cursor()
    c.execute('''
        SELECT conversation_id, query, response, timestamp
        FROM chats
        WHERE username = ?
        ORDER BY timestamp DESC
    ''', (username,))
    rows = c.fetchall()
    conn.close()

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
    print(f"Chat history retrieved for user: {username}")
    return jsonify({'conversations': valid_conversations}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5001)), debug=False)
