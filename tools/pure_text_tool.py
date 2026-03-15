"""
Pure text tool for OpenAI Realtime API function calling.
Provides the ability to write pure text on the whiteboard without any background shape.
"""

import time
from typing import Dict, Any


def get_pure_text_tool() -> dict:
    """
    Returns the pure text tool definition that can be called by the AI model.
    """
    return {
        "type": "function",
        "name": "write_pure_text",
        "description": "Write pure text on the whiteboard without any background shape. Use this for simple text annotations, labels, or notes.",
        "parameters": {
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "The text content to write on the whiteboard"
                },
                "size": {
                    "type": "string",
                    "description": "Text size: 's' (small), 'm' (medium), 'l' (large), 'xl' (extra large)",
                    "enum": ["s", "m", "l", "xl"],
                    "default": "m"
                },
                "color": {
                    "type": "string",
                    "description": "Text color: 'black', 'blue', 'red', 'green', 'yellow', 'orange', 'violet', 'grey'",
                    "enum": ["black", "blue", "red", "green", "yellow", "orange", "violet", "grey"],
                    "default": "black"
                },
                "font": {
                    "type": "string",
                    "description": "Font family: 'sans' (sans-serif), 'serif', 'mono' (monospace)",
                    "enum": ["sans", "serif", "mono"],
                    "default": "sans"
                },
                "align": {
                    "type": "string",
                    "description": "Text alignment: 'start' (left), 'middle' (center), 'end' (right)",
                    "enum": ["start", "middle", "end"],
                    "default": "start"
                }
            },
            "required": ["text"]
        }
    }


def execute_pure_text_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the pure text tool function and return the result.
    
    Args:
        tool_name: Name of the tool to execute (should be "write_pure_text")
        arguments: Arguments passed to the tool
        
    Returns:
        Dictionary containing the result or error
    """
    try:
        if tool_name != "write_pure_text":
            return {
                "success": False,
                "error": f"Unknown pure text tool: {tool_name}"
            }
        
        # Extract arguments with defaults
        text = arguments.get("text", "")
        size = arguments.get("size", "m")
        color = arguments.get("color", "black")
        font = arguments.get("font", "sans")
        align = arguments.get("align", "start")
        
        # Create pure text element data for frontend
        element_data = {
            "id": f"text_{hash(text)}_{size}_{hash(str(time.time()))}",
            "type": "pure_text",
            "content": text,
            "size": size,
            "color": color,
            "font": font,
            "align": align,
            "timestamp": time.time()
        }
        
        return {
            "success": True,
            "message": f"Pure text added: {text[:50]}{'...' if len(text) > 50 else ''}",
            "element": element_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }


