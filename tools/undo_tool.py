"""
Undo tool for OpenAI Realtime API function calling.
Provides the ability for the AI model to undo the last action on the whiteboard.
"""

import json
import time
from typing import Dict, Any


def get_undo_tool() -> dict:
    """
    Returns the undo tool definition that can be called by the AI model.
    This tool will be registered in the OpenAI Realtime API session.
    """
    return {
        "type": "function",
        "name": "undo_last_action",
        "description": """
            Undo the last action on the whiteboard. 
            Use this when the user wants to remove or revert the most recent change made to the whiteboard, 
            such as text or shapes that were just added. 
            Note to only use this once to undo your last change only, if used multiple times you may end up removing contents written by user as well.
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Optional reason for undoing the action (for logging purposes)",
                    "default": "User requested undo"
                }
            },
            "required": []
        }
    }


def execute_undo_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the undo tool function and return the result.
    
    Args:
        tool_name: Name of the tool to execute (should be "undo_last_action")
        arguments: Arguments passed to the tool
        
    Returns:
        Dictionary containing the result or error
    """
    try:
        if tool_name != "undo_last_action":
            return {
                "success": False,
                "error": f"Unknown undo tool: {tool_name}"
            }
        
        # Extract arguments with defaults
        reason = arguments.get("reason", "User requested undo")
        
        # Create undo action data for frontend
        undo_data = {
            "id": f"undo_{hash(str(time.time()))}",
            "type": "undo_action",
            "reason": reason,
            "timestamp": time.time()
        }
        
        return {
            "success": True,
            "message": f"Undoing last action: {reason}",
            "element": undo_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }
