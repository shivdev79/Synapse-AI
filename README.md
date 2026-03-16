# ✨ Synapse AI: Next-Gen Multimodal Intelligence

Synapse AI is a state-of-the-art, real-time multimodal AI agent designed to deliver a fluid, human-like interaction experience. Powered by **Gemini 2.5 Flash**, it bridges the gap between vision, voice, and reasoning in a single, immersive "Live Simulator" environment.

---

## ⚡ The Synapse Experience

Synapse AI moves beyond the "turn-based" chat paradigm. It is an **always-listening, always-seeing** companion that exists in a continuous stream.

### 🌟 Key Innovations

*   **👁️ Proactive Vision Analysis**: Unlike traditional bots, Synapse AI is context-aware. It processes live camera frames and can choose to "comment" on your environment even if you haven't typed a word.
*   **🎙️ Interruptible "Live" Streaming**: Experience natural dialogue. If you speak or type while the AI is responding, it will instantly interrupt itself to address your new input, mimicking real human conversation.
*   **🎨 Dynamic Tool Integration**: Deeply integrated with image generation and preference management. Ask for a concept, and Synapse will visualize it on the fly.
*   **🧠 High-Fidelity Memory**: Using a persistent `MemoryManager`, Synapse retains your preferences and conversation history across sessions, building a unique personality tailored to you.

---

## 🎨 Premium Design System

The Synapse UI is built on a custom **"Frosted Blue" Glassmorphism** design system:

*   **Modern Aesthetics**: Ultra-premium light theme with backdrop blurs, soft glows, and animated decorative blobs.
*   **A-Grade Typography**: Powered by the **Outfit** geometric font for a clean, sophisticated technical feel.
*   **Responsive Control**: Integrated a session-based history sidebar, real-time status badges, and an intuitive "Mission Control" layout.

---

## 🛠️ Technical Architecture

Synapse AI uses a "Live Simulator" backend architecture to provide low-latency interaction even on standard generative models.

*   **Backend**: Python / FastAPI
    *   **Asynchronous Message Handling**: Uses `asyncio` queues to manage overlapping inputs.
    *   **Chat Session Logic**: Leverages the official `google-genai` SDK with persistent chat sessions.
    *   **Live Simulator**: Background tasks handle the generation stream while keeping the WebSocket open for new inputs.
*   **Frontend**: React / Vite
    *   **Custom Design System**: Pure CSS architecture (No Tailwind) for maximum performance and unique branding.
    *   **Native Media API**: Direct integration with `navigator.mediaDevices` for high-performance camera and microphone polling.
*   **Database**: Firestore (Google Cloud) with local fallback.

---

## 🚀 Getting Started

### 1. Requirements
*   **Node.js** (v18+)
*   **Python** (3.10+)
*   **Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Setup & Installation
Clone the repository and follow these steps:

**Backend Setup:**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Create a .env file and add:
# GEMINI_API_KEY=your_actual_api_key
```

**Frontend Setup:**
```powershell
cd frontend
npm install
```

### 3. Launching the App
We’ve provided a "one-click" launcher for Windows users:
```powershell
.\start.ps1
```
*Alternatively, run `npm run dev` in the frontend folder and `uvicorn main:app` in the backend folder.*

---

## 📁 Project Structure

```text
Synapse-AI/
├── backend/                # FastAPI Brain
│   ├── app/                # Memory & Storage Modules
│   ├── main.py             # Live Simulator Logic
│   └── .env                # Private Keys (Ignored by Git)
├── frontend/               # React UI
│   ├── src/
│   │   ├── hooks/          # useLiveAgent (Streaming Logic)
│   │   └── App.jsx         # Main Interface
│   └── index.html          # App Shell
├── deployment/             # Docker & Cloud Scripts
├── start.ps1               # Automated Launcher
└── README.md               # You are here!
```

---

## 📜 License & Contribution
This project was built for the **Google Solution Challenge 2026**.
Feel free to fork, explore, and contribute to the next evolution of AI interaction!

Built with ❤️ by [shivdev79](https://github.com/shivdev79)
