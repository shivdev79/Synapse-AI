import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

def discover_live_models():
    versions = ["v1alpha", "v1beta"]
    for v in versions:
        print(f"\n--- Checking {v} ---")
        try:
            client = genai.Client(api_key=api_key, http_options={"api_version": v})
            for m in client.models.list():
                # Some SDK versions might not have supported_generation_methods as a top level attribute
                # or might use a different name. Let's inspect the model object.
                methods = getattr(m, 'supported_generation_methods', [])
                if "bidiGenerateContent" in methods:
                    print(f"FOUND: {m.name} supports bidiGenerateContent")
                elif "gemini-2.0" in m.name:
                    print(f"INFO: {m.name} found, supports: {methods}")
        except Exception as e:
            print(f"Error listing for {v}: {e}")

if __name__ == "__main__":
    discover_live_models()
