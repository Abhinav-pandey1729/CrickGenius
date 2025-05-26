from groq import Groq
import os
from dotenv import load_dotenv
from cricket_data import get_player_stats, get_match_conditions

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY)

def handle_query(query, history=None):
    """
    Process user query and return a response using Groq API with conversation history.
    """
    try:
        system_prompt = (
            "You are a Fantasy Cricket Chatbot Assistant, an expert in cricket analytics, "
            "fantasy cricket strategies, player performance, and match conditions. "
            "Provide accurate, concise, and actionable advice for fantasy cricket players. "
            "Use player stats or match conditions when relevant, and keep responses engaging. "
            "If the query is a follow-up, use the provided conversation history to maintain context."
        )

        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history[-10:])  # Limit to last 10 messages

        messages.append({"role": "user", "content": query})

        # Check for player stats or match conditions
        if "player" in query.lower() or "stats" in query.lower():
            player_name = extract_player_name(query)
            if player_name:
                stats = get_player_stats(player_name)
                if stats and not stats.get("error"):
                    messages.append({
                        "role": "system",
                        "content": f"Player stats for {player_name}: {stats}"
                    })

        if "match" in query.lower() or "conditions" in query.lower():
            conditions = get_match_conditions()
            if conditions:
                messages.append({
                    "role": "system",
                    "content": f"Current match conditions: {conditions}"
                })

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        return completion.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error in handle_query: {e}")
        return "Sorry, I couldn't process your query. Please try again."

def extract_player_name(query):
    """
    Extract player name from query (simple heuristic).
    """
    words = query.split()
    capitalized = [word for word in words if word.istitle() and len(word) > 2]
    if capitalized:
        return ' '.join(capitalized)
    return None

def get_response(query, history=None):
    """
    Wrapper for handle_query to match app.py's expected import and support history.
    """
    return handle_query(query, history=history)
