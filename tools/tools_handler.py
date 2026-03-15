"""
Whiteboard tools for Gemini Live API function calling.
Provides tools that allow the AI model to interact with the whiteboard.

This module serves as the main entry point for all whiteboard tools,
importing and coordinating individual tool modules.
"""

from typing import Dict, Any
from .undo_tool import get_undo_tool, execute_undo_tool
from .pure_text_tool import get_pure_text_tool, execute_pure_text_tool
from .shape_tool import get_shape_tool, execute_shape_tool
from .svg_tool import get_svg_tool, execute_svg_tool


def get_whiteboard_tools() -> list:
    """
    Returns raw tool definitions (OpenAPI schema format).
    """
    return [
        get_pure_text_tool(),
        get_shape_tool(),
        get_svg_tool(),
        get_undo_tool(),
    ]


def get_gemini_tools() -> list:
    """
    Returns tools wrapped in Gemini Live API's functionDeclarations format.
    Gemini expects: [{"functionDeclarations": [{"name": ..., "description": ..., "parameters": ...}]}]
    """
    raw_tools = get_whiteboard_tools()
    function_declarations = []
    for tool in raw_tools:
        # Each raw tool has: type, name, description, parameters
        function_declarations.append({
            "name": tool["name"],
            "description": tool["description"],
            "parameters": tool["parameters"],
        })
    return [{"functionDeclarations": function_declarations}]


def execute_whiteboard_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a whiteboard tool function and return the result.
    
    Args:
        tool_name: Name of the tool to execute
        arguments: Arguments passed to the tool
        
    Returns:
        Dictionary containing the result or error
    """
    try:
        # Route to appropriate tool module
        if tool_name == "write_pure_text":
            return execute_pure_text_tool(tool_name, arguments)
        elif tool_name == "draw_shape_with_text":
            return execute_shape_tool(tool_name, arguments)
        elif tool_name == "draw_svg":
            return execute_svg_tool(tool_name, arguments)
        elif tool_name == "undo_last_action":
            return execute_undo_tool(tool_name, arguments)
        else:
            return {
                "success": False,
                "error": f"Unknown tool: {tool_name}"
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }


