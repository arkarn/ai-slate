"""
Shape with text tool for OpenAI Realtime API function calling.
Provides the ability to draw shapes on the whiteboard with optional text inside.
"""

import time
from typing import Dict, Any


def get_shape_tool() -> dict:
    """
    Returns the shape tool definition that can be called by the AI model.
    """
    return {
        "type": "function",
        "name": "draw_shape_with_text",
        "description": "Draw a shape on the whiteboard with optional text inside. Use this for creating boxes, callouts, or highlighted sections.",
        "parameters": {
            "type": "object",
            "properties": {
                "shape": {
                    "type": "string",
                    "description": "Shape type to draw",
                    "enum": ["rectangle", "ellipse", "triangle", "diamond", "trapezoid", "rhombus", "hexagon", "cloud", "star"],
                    "default": "rectangle"
                },
                "text": {
                    "type": "string",
                    "description": "Optional text to display inside the shape",
                    "default": ""
                },
                "width": {
                    "type": "number",
                    "description": "Width of the shape in pixels",
                    "minimum": 50,
                    "maximum": 1000,
                    "default": 300
                },
                "height": {
                    "type": "number",
                    "description": "Height of the shape in pixels",
                    "minimum": 50,
                    "maximum": 500,
                    "default": 150
                },
                "color": {
                    "type": "string",
                    "description": "Shape outline and text color",
                    "enum": ["black", "blue", "red", "green", "yellow", "orange", "violet", "grey"],
                    "default": "black"
                },
                "fill": {
                    "type": "string",
                    "description": "Shape fill style: 'none' (transparent), 'semi' (semi-transparent), 'solid' (opaque)",
                    "enum": ["none", "semi", "solid"],
                    "default": "semi"
                },
                "dash": {
                    "type": "string",
                    "description": "Line style: 'draw' (hand-drawn), 'solid', 'dashed', 'dotted'",
                    "enum": ["draw", "solid", "dashed", "dotted"],
                    "default": "solid"
                },
                "size": {
                    "type": "string",
                    "description": "Line thickness and text size: 's', 'm', 'l', 'xl'",
                    "enum": ["s", "m", "l", "xl"],
                    "default": "m"
                }
            },
            "required": ["shape"]
        }
    }


def execute_shape_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the shape tool function and return the result.
    
    Args:
        tool_name: Name of the tool to execute (should be "draw_shape_with_text")
        arguments: Arguments passed to the tool
        
    Returns:
        Dictionary containing the result or error
    """
    try:
        if tool_name != "draw_shape_with_text":
            return {
                "success": False,
                "error": f"Unknown shape tool: {tool_name}"
            }
        
        # Extract arguments with defaults
        shape = arguments.get("shape", "rectangle")
        text = arguments.get("text", "")
        width = arguments.get("width", 300)
        height = arguments.get("height", 150)
        color = arguments.get("color", "black")
        fill = arguments.get("fill", "semi")
        dash = arguments.get("dash", "solid")
        size = arguments.get("size", "m")
        
        # Create shape element data for frontend
        element_data = {
            "id": f"shape_{shape}_{hash(str(time.time()))}",
            "type": "shape_with_text",
            "shape": shape,
            "text": text,
            "width": width,
            "height": height,
            "color": color,
            "fill": fill,
            "dash": dash,
            "size": size,
            "timestamp": time.time()
        }
        
        return {
            "success": True,
            "message": f"Shape '{shape}' added{' with text' if text else ''}",
            "element": element_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }
