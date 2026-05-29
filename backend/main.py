import os
from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Get Gemini Key
try:
    from config import GEMINI_API_KEY
except ImportError:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    masked_message: str

@app.post("/api/chat")
async def chat_api(request: ChatRequest):
    if not client:
        return {"cloud_response": "Server Error: Gemini Key missing."}
        
    try:
        response = await client.aio.models.generate_content(
            model="gemini-3.5-flash", 
            contents=request.masked_message
        )
        return {"cloud_response": response.text or ""}
    except Exception as e:
        return {"cloud_response": f"Error: {str(e)}"}

# --- PRODUCTION FRONTEND ROUTING ---
# This tells Python where to find the React build folder
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
assets_path = os.path.join(frontend_dist, "assets")

# Serve CSS and JS files
if os.path.isdir(assets_path):
    app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

# Serve the main index.html for everything else
@app.get("/{catchall:path}")
async def serve_react_app(catchall: str):
    # Prevent the frontend router from swallowing API errors
    if catchall.startswith("api/"): 
        return {"error": "API route not found"}
    
    # NEW: Check if the browser is asking for a specific file (like favicon.ico or logo.png)
    requested_file = os.path.join(frontend_dist, catchall)
    if os.path.isfile(requested_file):
        return FileResponse(requested_file)
    
    # Otherwise, fallback to the main index.html so React Router can take over
    html_file = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(html_file):
        return FileResponse(html_file)
        
    return {"error": "Frontend build not found. Please run 'npm run build' in the frontend folder."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)