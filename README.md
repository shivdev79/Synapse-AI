# ✨ Synapse AI: The Next-Gen Multimodal Agent

Synapse AI is a high-performance, real-time multimodal companion designed to break the barriers between human and machine interaction. Powered by the cutting-edge **Gemini 2.5 Flash**, Synapse can see, hear, speak, and create in a unified, fluid experience.

![Synapse AI Premium UI](https://img.shields.io/badge/UI-Ultra_Premium-0ea5e9?style=for-the-badge)
![Powered by Gemini](https://img.shields.io/badge/Brain-Gemini_2.5_Flash-6366f1?style=for-the-badge)

## 💎 Premium Experience
Synapse AI isn't just a chatbot—it's a living interface.
- **Frosted Light Design**: A state-of-the-art "Frosted Blue" UI featuring Glassmorphism, smooth micro-animations, and an intuitive layout.
- **Continuous Awareness**: Proactive vision commentary allows the AI to "jump into" the conversation based on what it sees through your camera.
- **Interruptible Streaming**: Natural, non-blocking conversations. You can interrupt the AI at any time, and it will pivot instantly—just like a real person.

## 🚀 Key Features
- **👁️ Multimodal Vision**: Real-time analysis of your environment through live camera frame processing.
- **🎙️ Voice & Text Convergence**: Seamless handling of text and audio-transcribed inputs.
- **🎨 Creative Tools**: Built-in `generate_image` integration to visualize concepts on the fly.
- **🧠 Long-term Synapse (Memory)**: remembers user preferences and maintains context across sessions using a persistent MemoryManager.
- **📡 Live API Simulator**: A robust background task architecture that provides a "Live API" feel even on standard streaming models.

## 🛠️ Quick Start

### 1. Prerequisites
- **Python 3.10+** & **Node.js**
- A **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Configuration
Create a `.env` file in the `backend/` directory:
```env
GEMINI_API_KEY=your_key_here
```

### 3. Launch
Run the automated launcher in PowerShell:
```powershell
.\start.ps1
```
Synapse AI will automatically spin up the **FastAPI Backend (8080)** and the **Vite Frontend (5173)**.

## 📁 Project Architecture
- **/backend**: Python FastAPI core leveraging `google-genai` for the "Live Simulator" logic.
- **/frontend**: React + Vite SPA with a highly optimized custom CSS design system.
- **/app**: Modular structure for Memory (History) and Storage (Media).

---
*Built with ❤️ for the Google Solution Challenge 2026*
