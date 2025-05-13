import requests
import os
from functools import lru_cache

CRIC_API_KEY = os.getenv("CRIC_API_KEY")
CRIC_API_URL = "https://api.cricapi.com/v1/"

@lru_cache(maxsize=100)
def get_player_stats(player_name):
    response = requests.get(f"{CRIC_API_URL}player_stats", params={"apikey": CRIC_API_KEY, "name": player_name})
    return response.json()

@lru_cache(maxsize=50)
def get_match_conditions(match_id):
    response = requests.get(f"{CRIC_API_URL}current_match", params={"apikey": CRIC_API_KEY, "id": match_id})
    return response.json()

def get_trending_players():
    response = requests.get(f"{CRIC_API_URL}fantasy_trends", params={"apikey": CRIC_API_KEY})
    return response.json()