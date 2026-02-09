#!/usr/bin/env python3
"""
Canvas LangChain Agent
A terminal-based agent that uses Gemini API to interact with Canvas via MCP tools.
"""

import asyncio
import os
import sys
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Load environment variables FIRST, before any other imports
load_dotenv()

import google.generativeai as genai

# Import your MCP tools (after env vars are loaded)
import canvas_mcp

# Debug: Check if environment variables are loaded (can be removed later)
print(f"🔍 Environment check:")
print(f"   GOOGLE_API_KEY: {'✅ Set' if os.getenv('GOOGLE_API_KEY') else '❌ Not set'}")
print(f"   CANVAS_API_KEY: {'✅ Set' if os.getenv('CANVAS_API_KEY') else '❌ Not set'}")
print(f"   CANVAS_BASE_URL: {os.getenv('CANVAS_BASE_URL', 'Not set')}")
print("=" * 50)

class CanvasAgent:
    def __init__(self):
        """Initialize the Canvas agent with Gemini API."""
        self.api_key = os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required")
        
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        
        # Initialize the Gemini model
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Available MCP tools - we need to call the underlying function
        self.tools = {
            "get_upcoming_assignments": canvas_mcp.get_upcoming_assignments.fn,
            "get_assignments_by_course": canvas_mcp.get_assignments_by_course.fn,
            "get_overdue_assignments": canvas_mcp.get_overdue_assignments.fn
        }
        

    async def call_tool(self, tool_name: str, **kwargs) -> Dict[str, Any]:
        """Call an MCP tool and return the result."""
        print(f"🔧 Calling tool: {tool_name}")
        print(f"📝 Tool parameters: {kwargs}")
        
        if tool_name not in self.tools:
            error_msg = f"Tool {tool_name} not found"
            print(f"❌ {error_msg}")
            return {"error": error_msg}
        
        try:
            result = await self.tools[tool_name](**kwargs)
            print(f"✅ Tool {tool_name} completed successfully")
            return result
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Tool {tool_name} failed: {error_msg}")
            return {"error": error_msg}

    def parse_user_intent(self, user_input: str) -> Dict[str, Any]:
        """Parse user input to determine intent and extract parameters."""
        user_input_lower = user_input.lower()
        
        # Check for specific intents
        if any(word in user_input_lower for word in ["upcoming", "due", "assignments", "homework"]):
            if "course" in user_input_lower and any(char.isdigit() for char in user_input):
                # Extract course ID if mentioned
                import re
                course_id_match = re.search(r'course\s*(\d+)', user_input_lower)
                if course_id_match:
                    course_id = int(course_id_match.group(1))
                    return {
                        "tool": "get_assignments_by_course",
                        "params": {"course_id": course_id}
                    }
            return {"tool": "get_upcoming_assignments", "params": {}}
        
        elif any(word in user_input_lower for word in ["overdue", "late", "missed"]):
            return {"tool": "get_overdue_assignments", "params": {}}
        
        elif "course" in user_input_lower and any(char.isdigit() for char in user_input):
            import re
            course_id_match = re.search(r'course\s*(\d+)', user_input_lower)
            if course_id_match:
                course_id = int(course_id_match.group(1))
                return {
                    "tool": "get_assignments_by_course",
                    "params": {"course_id": course_id}
                }
        
        # Default to upcoming assignments
        return {"tool": "get_upcoming_assignments", "params": {}}

    async def process_query(self, user_input: str) -> str:
        """Process a user query and return a response."""
        try:
            print(f"🤔 Processing query: '{user_input}'")
            
            # Parse user intent
            intent = self.parse_user_intent(user_input)
            print(f"🎯 Detected intent: {intent}")
            
            # Call the appropriate tool
            tool_result = await self.call_tool(intent["tool"], **intent["params"])
            
            # Create a prompt for the LLM to format the response
            prompt = f"""You are a helpful Canvas assignment assistant. You can help users with:

1. Getting upcoming assignments across all courses
2. Getting assignments for a specific course
3. Getting overdue assignments
4. Answering questions about assignments, due dates, and course information

User asked: "{user_input}"

I called the tool {intent["tool"]} with parameters {intent["params"]} and got this result:

{tool_result}

Please provide a helpful, formatted response to the user based on this data. If there are any errors, explain them clearly. Always format dates nicely and provide relevant details like course names, due dates, and points possible."""

            # Generate response using Gemini
            response = self.model.generate_content(prompt)
            
            return response.text
            
        except Exception as e:
            return f"Sorry, I encountered an error: {str(e)}"

    async def run_interactive(self):
        """Run the agent in interactive mode."""
        print("🎓 Canvas Assignment Assistant")
        print("=" * 50)
        print("Ask me about your Canvas assignments!")
        print("Examples:")
        print("- 'What assignments are due soon?'")
        print("- 'Show me overdue assignments'")
        print("- 'What assignments are due in course 12345?'")
        print("- 'Type 'quit' to exit")
        print("=" * 50)
        
        while True:
            try:
                user_input = input("\n🤔 Your question: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'bye']:
                    print("👋 Goodbye!")
                    break
                
                if not user_input:
                    continue
                
                print("\n🔄 Thinking...")
                response = await self.process_query(user_input)
                print(f"\n🤖 Assistant: {response}")
                
            except KeyboardInterrupt:
                print("\n👋 Goodbye!")
                break
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")

async def main():
    """Main function to run the agent."""
    try:
        agent = CanvasAgent()
        await agent.run_interactive()
    except Exception as e:
        print(f"Failed to start agent: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())