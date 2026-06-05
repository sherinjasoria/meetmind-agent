# 🧠 MeetMind

MeetMind is an AI meeting intelligence agent that helps you prepare for meetings by remembering past conversations, missed follow-ups, client preferences, sensitive topics, and relationship history.

Most meeting assistants summarize what happened.

MeetMind helps you prepare for what happens next.

---

## ✨ Features

- 🧠 **Persistent memory** using Hindsight
- 🔁 **Memory ON/OFF mode** to compare generic vs memory-backed responses
- 📋 **Meeting brief** with readiness score, warnings, mood, and competitor context
- 🚫 **Do-not-say warnings** for sensitive meeting topics
- 🕒 **Memory timeline** of previous interactions
- 📝 **Post-meeting learning** to save new outcomes
- 🎯 **Practice mode** with client roleplay and scorecard feedback

---

## 🛠️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Python, Flask, Flask-CORS
- **LLM:** Groq
- **Memory Layer:** Hindsight

---

## 📁 Project Structure

```bash
meetmind-agent/
├── backend/
│   ├── app.py
│   ├── data.py
│   └── hindsight_memory.py
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md

🧪 Example

Ask MeetMind:

Prep me for Rahul's meeting.

With memory off, it gives generic advice.

With memory on, it recalls Rahul’s past meetings, pending CTO approval, competitor mention, legal concerns, and do-not-say warnings.

🔗 Hindsight

MeetMind uses Hindsight to retain and recall meeting memories across interactions.

Hindsight GitHub
Hindsight Docs
Agent Memory by Vectorize

💡 Why MeetMind

MeetMind is built around one idea:

A meeting assistant should not just remember what happened.
It should help you walk into the next meeting better prepared.
