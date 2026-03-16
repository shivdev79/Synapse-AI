import asyncio
import os
import json
import base64
import logging
import urllib.parse
import uuid
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types

from app.memory import MemoryManager
from app.storage import StorageManager

# ── Load environment ──────────────────────────────────
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VisionMate AI Backend")
memory = MemoryManager()
storage_manager = StorageManager()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── System prompt ─────────────────────────────────────
SYSTEM_INSTRUCTION = """
You are Synapse AI — a brilliant, friendly, multimodal companion.

CAPABILITIES:
• You can SEE through the user's camera when they send frames.
• You can HEAR and RESPOND to user queries.
• You can GENERATE images/diagrams via the `generate_image` tool.
• You can TRANSLATE, SUMMARIZE, and EXPLAIN topics via your tools.
• You can REMEMBER user preferences via the `save_preference` tool.

GUIDES:
1. Be concise and helpful.
2. When the user asks for an image, diagram, or visual — use the generate_image tool.
3. If they mention a personal detail, save it.
4. If an image is provided in the prompt, analyze it thoroughly.
"""

# Using Gemini 2.5 Flash (Confirmed working with this project's quota)
MODEL_ID = "gemini-2.5-flash"

# Define tools
TOOLS = [
    types.Tool(function_declarations=[
        types.FunctionDeclaration(
            name="generate_image",
            description="Generate an image based on a prompt.",
            parameters={
                "type": "OBJECT",
                "properties": {"prompt": {"type": "STRING"}},
                "required": ["prompt"]
            }
        ),
        types.FunctionDeclaration(
            name="save_preference",
            description="Save a user preference.",
            parameters={
                "type": "OBJECT",
                "properties": {
                    "key": {"type": "STRING"},
                    "value": {"type": "STRING"}
                },
                "required": ["key", "value"]
            }
        )
    ])
]

@app.get("/")
def read_root(): return {"status": "VisionMate AI API is running"}

@app.websocket("/ws/live")
async def stable_agent_socket(websocket: WebSocket):
    await websocket.accept()
    session_id = str(uuid.uuid4())
    logger.info(f"Client connected — stable mode — {session_id}")

    api_key = os.environ.get("GEMINI_API_KEY", "")
    client = genai.Client(api_key=api_key)
    
    # State for multimodal input
    last_image = None
    frame_count = 0
    vision_trigger_count = 120 # Respond every 2 minutes by default to be safe with 20-req/day quota

    # Load preferences
    user_prefs = memory.get_preferences("default_user")
    pref_context = "\n\nPREFERENCES: " + str(user_prefs) if user_prefs else ""

    await websocket.send_json({"type": "session_id", "data": session_id})

    # --- Live API Simulator (Stable Mode with Interruptions) ---
    try:
        chat_session = client.aio.chats.create(
            model=MODEL_ID,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION + pref_context,
                tools=TOOLS
            )
        )
    except Exception as e:
        logger.error(f"Failed to create chat session: {e}")
        await websocket.send_json({"type": "error", "message": f"AI Init Failed: {e}"})
        return
    
    response_task = None
    input_queue = asyncio.Queue()

    async def handle_responses():
        nonlocal response_task
        while True:
            # Wait for any trigger (text, audio, or vision)
            trigger_data = await input_queue.get()
            user_text = trigger_data.get("text", "")
            image_bytes = trigger_data.get("image")
            
            # Construct content
            parts = []
            if user_text: parts.append(types.Part.from_text(text=user_text))
            if image_bytes: parts.append(types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"))
            
            if not parts:
                input_queue.task_done()
                continue

            # Cancel previous response if still running (Interruption)
            if response_task and not response_task.done():
                response_task.cancel()
                logger.info("Interrupted previous response.")

            async def run_gen():
                try:
                    full_resp = ""
                    max_retries = 3
                    for attempt in range(max_retries):
                        try:
                            async for chunk in await chat_session.send_message_stream(message=parts):
                                if chunk.text:
                                    full_resp += chunk.text
                                    await websocket.send_json({"type": "text", "data": chunk.text})
                                
                                # Process tools
                                if chunk.candidates and chunk.candidates[0].content.parts:
                                    for part in chunk.candidates[0].content.parts:
                                        if part.function_call:
                                            # We need to handle tool calls in a way that aligns with chat_session
                                            # For now, we use our existing stable tool handler
                                            await handle_stable_tool(part.function_call, websocket, session_id)
                            break
                        except Exception as e:
                            if "429" in str(e) and attempt < max_retries - 1:
                                await asyncio.sleep(2 * (attempt + 1))
                                continue
                            raise e
                    
                    if full_resp:
                        memory.save_chat(session_id, "assistant", full_resp)
                except asyncio.CancelledError:
                    pass
                except Exception as e:
                    logger.exception(f"Generation error: {e}")
                    await websocket.send_json({"type": "error", "message": f"Busy ({e})"})

            response_task = asyncio.create_task(run_gen())
            input_queue.task_done()

    # Start the response handler in the background
    asyncio.create_task(handle_responses())

    try:
        while True:
            try:
                raw = await websocket.receive_text()
                data = json.loads(raw)
            except Exception as e:
                continue

            msg_type = data.get("type", "")

            if msg_type == "image":
                last_image = base64.b64decode(data["data"])
                logger.debug(f"Received frame {frame_count} for session {session_id}")
                frame_count += 1
                if frame_count >= vision_trigger_count:
                    frame_count = 0
                    # Trigger proactive vision response
                    await input_queue.put({"image": last_image, "text": "Observe and comment briefly."})
                continue

            if msg_type == "text" or msg_type == "audio_transcription":
                user_text = data.get("data", "")
                if not user_text: continue
                
                memory.save_chat(session_id, "user", user_text)
                await input_queue.put({"text": user_text, "image": last_image})
                last_image = None # Reset after sending with text

    except WebSocketDisconnect:
        logger.info(f"Client disconnected - {session_id}")

async def handle_stable_tool(call, websocket, session_id):
    name = call.name
    args = call.args
    logger.info(f"Stable Tool: {name}({args})")
    
    if name == "generate_image":
        prompt = args.get("prompt", "a visual")
        url = f"https://image.pollinations.ai/prompt/{urllib.parse.quote(prompt)}?width=800&height=600"
        url = storage_manager.upload_from_url(url, filename_prefix="mate")
        await websocket.send_json({"type": "image_result", "url": url, "label": prompt})

    elif name == "save_preference":
        memory.save_preferences("default_user", {args['key']: args['value']})

@app.get("/history/{session_id}")
def get_history(session_id: str):
    return {"history": memory.get_history(session_id)}
