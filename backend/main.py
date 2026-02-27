import sys
import os
import warnings

# --- 1. SETUP PATHS & WARNINGS ---
# Add the current directory to Python's path so it can find 'src'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Suppress the Google Generative AI deprecation warnings
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

from dotenv import load_dotenv
from langchain_core.globals import set_debug

# --- 2. LOAD ENVIRONMENT VARIABLES ---
# Force load .env from the current directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- 3. IMPORT AGENT ---
try:
    from src.agents.advisor import agent_executor
except ImportError as e:
    print("\nCRITICAL ERROR: Could not import the agent.")
    print(f"Details: {e}")
    print("Ensure you have __init__.py files in your 'src' and 'src/agents' folders.\n")
    sys.exit(1)

# --- 4. DEBUG MODE (Optional) ---
# Set to True if you want to see exactly what the agent is thinking/doing
DEBUG_MODE = True
if DEBUG_MODE:
    set_debug(True)

def main():
    # Check for API Key
    if not os.getenv("GOOGLE_API_KEY"):
        print("\nERROR: GOOGLE_API_KEY not found in .env file.")
        print("Please create a .env file with: GOOGLE_API_KEY=your_key_here")
        return

    print("Initializing Vehicle Diagnostic Agent...")
    try:
        # The agent executor is already initialized upon import
        pass
    except Exception as e:
        print(f"\nFailed to build agent: {e}")
        return

    print("\n" + "="*40)
    print(" ðŸš—  VEHICLE DIAGNOSTIC SYSTEM READY")
    print("="*40)
    print("Type 'exit' or 'quit' to stop.")
    print("Examples:")
    print(" - 'What is code P0300?' (Uses RAG)")
    print(" - 'Recalls for 2024 Toyota Tacoma?' (Uses Web Search)")
    print("="*40 + "\n")

    while True:
        try:
            user_input = input("User: ").strip()
            if user_input.lower() in ["exit", "quit"]:
                print("Shutting down...")
                break
            
            if not user_input:
                continue

            print("\nAdvisor is thinking...")
            
            # Run the agent
            response = agent_executor.invoke({"input": user_input})
            
            # Output the result
            output_text = response.get('output', "No response generated.")
            print(f"Advisor: {output_text}\n")

        except KeyboardInterrupt:
            print("\n\nOperation cancelled by user.")
            break
        except Exception as e:
            print(f"\nAn error occurred: {e}\n")

if __name__ == "__main__":
    main()
