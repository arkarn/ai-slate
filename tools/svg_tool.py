"""
SVG generation tool for OpenAI Realtime API function calling.
Instructs the AI to generate SVG code and renders it on the whiteboard.
"""

import time
from typing import Dict, Any


def get_svg_tool() -> dict:
    """
    Returns the SVG tool definition that can be called by the AI model.
    """
    return {
        "type": "function",
        "name": "draw_svg",
        "description": """
            Generate and draw an SVG image on the whiteboard. 
            User won't explictly ask you to draw SVG image, but use your best judgement.
            If user requested drawing can't be drawn with other simple shapes tool, then use this tool always if its possible to draw with SVG.
            This tool will create SVG code based on the description and render it as an image on the whiteboard.
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "description": {
                    "type": "string",
                    "description": "Description of what to draw (e.g., 'a red circle', 'a house with a tree', 'a simple diagram')"
                },
                "svg_code": {
                    "type": "string",
                    "description": "The SVG code to render. Should be complete SVG markup starting with <svg> tag."
                },
                "width": {
                    "type": "number",
                    "description": "Width of the SVG in pixels",
                    "minimum": 50,
                    "maximum": 800,
                    "default": 300
                },
                "height": {
                    "type": "number",
                    "description": "Height of the SVG in pixels", 
                    "minimum": 50,
                    "maximum": 600,
                    "default": 200
                }
            },
            "required": ["svg_code"]
        }
    }


def execute_svg_tool(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute the SVG tool function and return the result.
    
    Args:
        tool_name: Name of the tool to execute (should be "draw_svg")
        arguments: Arguments passed to the tool
        
    Returns:
        Dictionary containing the result or error
    """
    try:
        if tool_name != "draw_svg":
            return {
                "success": False,
                "error": f"Unknown SVG tool: {tool_name}"
            }
        
        # Extract arguments with defaults
        svg_code = arguments.get("svg_code", "")
        description = arguments.get("description", "SVG drawing")
        width = arguments.get("width", 300)
        height = arguments.get("height", 200)
        
        if not svg_code.strip():
            return {
                "success": False,
                "error": "SVG code is required"
            }
        
        # Create SVG data URL for TLDraw image shape
        import base64
        svg_base64 = base64.b64encode(svg_code.encode('utf-8')).decode('utf-8')
        svg_data_url = f"data:image/svg+xml;base64,{svg_base64}"
        
        # Create SVG element data for frontend
        element_data = {
            "id": f"svg_{hash(str(time.time()))}",
            "type": "svg_image",
            "description": description,
            "svg_code": svg_code,
            "svg_data_url": svg_data_url,
            "width": width,
            "height": height,
            "timestamp": time.time()
        }
        
        return {
            "success": True,
            "message": f"SVG created: {description[:50]}{'...' if len(description) > 50 else ''}",
            "element": element_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error executing {tool_name}: {str(e)}"
        }
