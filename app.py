from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
import os
from dotenv import load_dotenv
from data import CONTACTS
from hindsight_memory import recall_memory, store_contact_history
from hindsight_memory import retain_memory

load_dotenv()

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Store all contacts into Hindsight on startup
def initialize_memory():
    print("🧠 Loading all contact history into Hindsight memory...")
    for contact in CONTACTS:
        store_contact_history(contact)
    print("✅ Memory loaded!")

@app.route("/api/contacts", methods=["GET"])
def get_contacts():
    simplified = []
    for c in CONTACTS:
        meeting_count = len(c["meetings"])
        memory_strength = min(100, meeting_count * 20)
        last_meeting = c["meetings"][-1] if c["meetings"] else None
        missed_followups = sum(1 for m in c["meetings"] if not m["followed_up"])
        
        simplified.append({
            "id": c["id"],
            "name": c["name"],
            "company": c["company"],
            "role": c["role"],
            "meeting_count": meeting_count,
            "memory_strength": memory_strength,
            "last_meeting": last_meeting["date"] if last_meeting else "None",
            "missed_followups": missed_followups,
            "mood": last_meeting["mood"] if last_meeting else "neutral"
        })
    return jsonify(simplified)

@app.route("/api/contact/<contact_id>", methods=["GET"])
def get_contact(contact_id):
    contact = next((c for c in CONTACTS if c["id"] == contact_id), None)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    return jsonify(contact)

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    contact_id = data.get("contact_id")
    message = data.get("message")
    memory_enabled = data.get("memory_enabled", True)
    
    contact = next((c for c in CONTACTS if c["id"] == contact_id), None)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    if memory_enabled:
        # Recall from Hindsight
        memories = recall_memory(contact["name"], message)
        memory_context = ""
        if memories and "results" in memories:
            memory_context = "\n".join([m.get("content", "") for m in memories["results"]])
        
        system_prompt = f"""You are MeetMind, an elite AI meeting preparation assistant.
You have deep memory of all past interactions with {contact["name"]}.

MEMORY FROM HINDSIGHT:
{memory_context}

CONTACT PROFILE:
Name: {contact["name"]}
Company: {contact["company"]}
Role: {contact["role"]}
Personality: {contact["personality"]}
Competitor they mentioned: {contact.get("competitor", "None")}
Warnings: {", ".join(contact["warnings"])}

Based on this memory, give extremely personalized, specific meeting preparation advice.
Be direct, confident, and actionable. Format your response clearly with sections.
Use emojis sparingly for visual clarity."""

    else:
        system_prompt = f"""You are a generic AI assistant with NO memory of past interactions.
You know nothing about {contact["name"]} except their name and company.
Give only generic meeting advice. Do not mention any specific details."""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ],
        max_tokens=1000
    )
    
    reply = response.choices[0].message.content
    return jsonify({"reply": reply, "memory_enabled": memory_enabled})

@app.route("/api/brief/<contact_id>", methods=["GET"])
def get_brief(contact_id):
    contact = next((c for c in CONTACTS if c["id"] == contact_id), None)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    meetings = contact["meetings"]
    missed = [m for m in meetings if not m["followed_up"]]
    meeting_count = len(meetings)
    memory_strength = min(100, meeting_count * 20)
    
    # Calculate readiness score
    readiness = memory_strength
    if missed:
        readiness -= len(missed) * 10
    readiness = max(0, min(100, readiness))
    
    last_meeting = meetings[-1] if meetings else None
    
    brief = {
        "contact_name": contact["name"],
        "company": contact["company"],
        "role": contact["role"],
        "readiness_score": readiness,
        "memory_strength": memory_strength,
        "meeting_count": meeting_count,
        "missed_followups": len(missed),
        "warnings": contact["warnings"],
        "personality": contact["personality"],
        "competitor": contact.get("competitor", "None"),
        "last_meeting": last_meeting,
        "missed_details": missed,
        "timeline": [
            {
                "date": m["date"],
                "title": m["title"],
                "mood": m["mood"],
                "summary": m["summary"]
            }
            for m in meetings
        ]
    }
    return jsonify(brief)

@app.route("/api/post-meeting", methods=["POST"])
def post_meeting():
    data = request.json
    contact_id = data.get("contact_id")
    outcome = data.get("outcome")
    
    contact = next((c for c in CONTACTS if c["id"] == contact_id), None)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404
    
    retain_memory(contact["name"], f"Post-meeting outcome: {outcome}")
    
    return jsonify({"success": True, "message": "Memory updated! Agent is now smarter. 🧠"})

@app.route("/api/practice", methods=["POST"])
def practice():
    data = request.json
    contact_id = data.get("contact_id")
    message = data.get("message")
    history = data.get("history", [])
    mode = data.get("mode", "practice")
    
    contact = next((c for c in CONTACTS if c["id"] == contact_id), None)
    if not contact:
        return jsonify({"error": "Contact not found"}), 404

    if mode == "feedback":
        system_prompt = f"""You are MeetMind, an expert sales coach analyzing a practice conversation.
The user was practicing a meeting with {contact["name"]} ({contact["role"]} at {contact["company"]}).

Contact personality: {contact["personality"]}
Warnings to follow: {", ".join(contact["warnings"])}
Competitor to avoid: {contact.get("competitor", "None")}

Analyze the conversation and give a performance scorecard.

Format your response EXACTLY like this:

🎯 PRACTICE SESSION SCORECARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 SCORES:
Confidence: [X]/10
Objection Handling: [X]/10
Strategic Approach: [X]/10
Overall Readiness: [X]%

✅ WHAT YOU DID WELL:
- [specific thing from conversation]
- [specific thing from conversation]

⚠️ NEEDS IMPROVEMENT:
- [specific thing to fix]
- [specific thing to fix]

🚀 TOP 3 TIPS FOR REAL MEETING:
1. [actionable tip]
2. [actionable tip]  
3. [actionable tip]

Be specific — reference actual things said in the conversation."""

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": "Give me my scorecard now."})

    else:
        system_prompt = f"""You are roleplaying as {contact["name"]}, {contact["role"]} at {contact["company"]}.

Your personality: {contact["personality"]}
Your past concerns: {", ".join(contact["warnings"])}
Your competitor preference: {contact.get("competitor", "None")}

You are in a business meeting. Respond AS {contact["name"]} — be realistic, slightly challenging, ask tough questions.
Keep responses short — 2-3 sentences max.
Be authentic to the personality described.
Do NOT break character.
Do NOT give advice or coaching — just BE {contact["name"]}."""

        messages = [{"role": "system", "content": system_prompt}]
        for h in history:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1000
    )

    reply = response.choices[0].message.content
    return jsonify({"reply": reply})

if __name__ == "__main__":
    initialize_memory()
    app.run(debug=True, port=5001)