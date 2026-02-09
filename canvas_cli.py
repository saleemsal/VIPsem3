#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
import sys

# Prefer the complete tool registry if available
try:
    from canvas_mcp_complete import run_tool, list_available_tools  # type: ignore
    HAS_COMPLETE = True
except Exception:
    HAS_COMPLETE = False

# Fallback: import a subset from canvas_mcp (minimal tools)
if not HAS_COMPLETE:
    from typing import Any, Dict
    from canvas_mcp import get_upcoming_assignments, get_assignments_by_course, get_overdue_assignments  # type: ignore

    async def list_available_tools():
        return {
            "success": True,
            "data": {
                "total_tools": 3,
                "tools": {
                    "get_upcoming_assignments": {"name": "get_upcoming_assignments", "description": "Get upcoming assignments"},
                    "get_assignments_by_course": {"name": "get_assignments_by_course", "description": "Get assignments by course"},
                    "get_overdue_assignments": {"name": "get_overdue_assignments", "description": "Get overdue assignments"},
                },
            },
        }

    async def run_tool(tool_name: str, **kwargs):
        tools = {
            "get_upcoming_assignments": get_upcoming_assignments,
            "get_assignments_by_course": get_assignments_by_course,
            "get_overdue_assignments": get_overdue_assignments,
        }
        if tool_name not in tools:
            return {"success": False, "error": f"Unknown tool: {tool_name}"}
        return await tools[tool_name](**kwargs)


async def main():
    parser = argparse.ArgumentParser(description="Canvas MCP CLI bridge")
    parser.add_argument("command", choices=["list-tools", "call"], help="What to do")
    parser.add_argument("--tool", dest="tool", help="Tool name for call")
    parser.add_argument("--args", dest="args_json", help="JSON args for tool", default="{}")
    # Canvas creds via env: CANVAS_API_URL, CANVAS_API_KEY
    args = parser.parse_args()

    try:
        if args.command == "list-tools":
            result = await list_available_tools()
        else:
            if not args.tool:
                raise ValueError("--tool is required for 'call'")
            try:
                tool_args = json.loads(args.args_json) if args.args_json else {}
            except Exception as e:
                raise ValueError(f"Invalid --args JSON: {e}")
            result = await run_tool(args.tool, **tool_args)

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())


