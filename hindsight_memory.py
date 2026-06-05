import requests
import os
from dotenv import load_dotenv

load_dotenv()

HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
BASE_URL = "https://api.hindsight.vectorize.io/v1"

headers = {
    "Authorization": f"Bearer {HINDSIGHT_API_KEY}",
    "Content-Type": "application/json"
}

def retain_memory(contact_name, content):
    """Save a memory about a contact"""
    try:
        response = requests.post(
            f"{BASE_URL}/retain",
            headers=headers,
            json={
                "content": f"Contact: {contact_name}. {content}",
                "metadata": {"contact": contact_name}
            }
        )
        return response.json()
    except Exception as e:
        print(f"Retain error: {e}")
        return None

def recall_memory(contact_name, query):
    """Recall memories about a contact"""
    try:
        response = requests.post(
            f"{BASE_URL}/recall",
            headers=headers,
            json={
                "query": f"{contact_name}: {query}",
                "top_k": 5
            }
        )
        return response.json()
    except Exception as e:
        print(f"Recall error: {e}")
        return []

def store_contact_history(contact):
    """Store all meeting history for a contact into Hindsight"""
    contact_name = contact["name"]
    
    # Store personality
    retain_memory(contact_name, f"Personality: {contact['personality']}")
    
    # Store warnings
    for warning in contact["warnings"]:
        retain_memory(contact_name, f"Warning: {warning}")
    
    # Store each meeting
    for meeting in contact["meetings"]:
        content = f"""
        Meeting on {meeting['date']}: {meeting['title']}.
        Summary: {meeting['summary']}.
        Mood: {meeting['mood']}.
        Promise made: {meeting['promises']}.
        Followed up: {meeting['followed_up']}.
        """
        retain_memory(contact_name, content)
    
    return True