import asyncio
import os
from datetime import datetime, timedelta
from typing import Any, Sequence
import httpx
from fastmcp import FastMCP

# Initialize the MCP server
mcp = FastMCP("Canvas Assignments Server")

# Canvas API configuration
CANVAS_BASE_URL = os.getenv("CANVAS_BASE_URL", "https://gatech.instructure.com")
CANVAS_API_KEY = os.getenv("CANVAS_API_KEY")

# Debug: Check if environment variables are loaded in MCP (can be removed later)
print(f"🔍 MCP Environment check:")
print(f"   CANVAS_API_KEY: {'✅ Set' if CANVAS_API_KEY else '❌ Not set'}")
print(f"   CANVAS_BASE_URL: {CANVAS_BASE_URL}")

async def make_canvas_request(endpoint: str, params: dict = None):
    """Make an authenticated request to the Canvas API"""
    if not CANVAS_API_KEY:
        raise ValueError("CANVAS_API_KEY environment variable is required")
    
    headers = {
        "Authorization": f"Bearer {CANVAS_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{CANVAS_BASE_URL}/api/v1{endpoint}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        print(f"🔍 Canvas API Request: {url}")
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Canvas API Error: {response.status_code} - {response.text}")
            response.raise_for_status()
        
        return response.json()

@mcp.tool
async def get_upcoming_assignments(days_ahead: int = 30) -> dict[str, Any]:
    """
    Get all upcoming assignments and their due dates from Canvas.
    
    Args:
        days_ahead: Number of days ahead to look for assignments (default: 30)
    
    Returns:
        Dictionary containing upcoming assignments with course info and due dates
    """
    try:
        # Calculate the date range
        today = datetime.now()
        end_date = today + timedelta(days=days_ahead)
        
        # Get user's courses
        courses = await make_canvas_request("/courses", {
            "enrollment_state": "active",
            "per_page": 100
        })
        
        all_assignments = []
        
        for course in courses:
            if not course.get('name'):
                continue
                
            course_id = course['id']
            course_name = course['name']
            
            # Get assignments for this course
            try:
                assignments = await make_canvas_request(
                    f"/courses/{course_id}/assignments",
                    {
                        "bucket": "upcoming",
                        "per_page": 100,
                        "order_by": "due_at"
                    }
                )
                
                for assignment in assignments:
                    due_at = assignment.get('due_at')
                    if not due_at:
                        continue
                    
                    # Parse due date
                    try:
                        due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                        
                        # Make sure all dates are timezone-aware for comparison
                        if today.tzinfo is None:
                            today = today.replace(tzinfo=due_date.tzinfo)
                        if end_date.tzinfo is None:
                            end_date = end_date.replace(tzinfo=due_date.tzinfo)
                        
                        # Only include assignments within our date range
                        if today <= due_date <= end_date:
                            assignment_info = {
                                "course_name": course_name,
                                "course_id": course_id,
                                "assignment_name": assignment['name'],
                                "assignment_id": assignment['id'],
                                "due_date": due_date.isoformat(),
                                "due_date_formatted": due_date.strftime("%B %d, %Y at %I:%M %p"),
                                "points_possible": assignment.get('points_possible', 'N/A'),
                                "submission_types": assignment.get('submission_types', []),
                                "html_url": assignment.get('html_url', ''),
                                "description": assignment.get('description', '')[:200] + "..." if assignment.get('description') and len(assignment.get('description', '')) > 200 else assignment.get('description', ''),
                                "days_until_due": (due_date - today).days
                            }
                            all_assignments.append(assignment_info)
                    except ValueError:
                        # Skip assignments with invalid date formats
                        continue
                        
            except httpx.HTTPStatusError as e:
                # Skip courses we can't access
                continue
        
        # Sort by due date
        all_assignments.sort(key=lambda x: x['due_date'])
        
        return {
            "success": True,
            "total_assignments": len(all_assignments),
            "date_range": f"{today.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}",
            "assignments": all_assignments
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "assignments": []
        }

@mcp.tool
async def get_assignments_by_course(course_id: int, days_ahead: int = 30) -> dict[str, Any]:
    """
    Get upcoming assignments for a specific course.
    
    Args:
        course_id: The Canvas course ID
        days_ahead: Number of days ahead to look for assignments (default: 30)
    
    Returns:
        Dictionary containing assignments for the specified course
    """
    try:
        # Calculate date range
        today = datetime.now()
        end_date = today + timedelta(days=days_ahead)
        
        # Get course info
        course = await make_canvas_request(f"/courses/{course_id}")
        
        # Get assignments
        assignments = await make_canvas_request(
            f"/courses/{course_id}/assignments",
            {
                "bucket": "upcoming",
                "per_page": 100,
                "order_by": "due_at"
            }
        )
        
        filtered_assignments = []
        
        for assignment in assignments:
            due_at = assignment.get('due_at')
            if not due_at:
                continue
                
            try:
                due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                
                # Make sure all dates are timezone-aware for comparison
                if today.tzinfo is None:
                    today = today.replace(tzinfo=due_date.tzinfo)
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=due_date.tzinfo)
                
                if today <= due_date <= end_date:
                    assignment_info = {
                        "assignment_name": assignment['name'],
                        "assignment_id": assignment['id'],
                        "due_date": due_date.isoformat(),
                        "due_date_formatted": due_date.strftime("%B %d, %Y at %I:%M %p"),
                        "points_possible": assignment.get('points_possible', 'N/A'),
                        "submission_types": assignment.get('submission_types', []),
                        "html_url": assignment.get('html_url', ''),
                        "description": assignment.get('description', '')[:200] + "..." if assignment.get('description') and len(assignment.get('description', '')) > 200 else assignment.get('description', ''),
                        "days_until_due": (due_date - today).days
                    }
                    filtered_assignments.append(assignment_info)
            except ValueError:
                continue
        
        # Sort by due date
        filtered_assignments.sort(key=lambda x: x['due_date'])
        
        return {
            "success": True,
            "course_name": course['name'],
            "course_id": course_id,
            "total_assignments": len(filtered_assignments),
            "assignments": filtered_assignments
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "assignments": []
        }

@mcp.tool
async def get_overdue_assignments() -> dict[str, Any]:
    """
    Get all overdue assignments from Canvas.
    
    Returns:
        Dictionary containing overdue assignments
    """
    try:
        # Get user's courses
        courses = await make_canvas_request("/courses", {
            "enrollment_state": "active",
            "per_page": 100
        })
        
        overdue_assignments = []
        today = datetime.now()
        
        for course in courses:
            if not course.get('name'):
                continue
                
            course_id = course['id']
            course_name = course['name']
            
            try:
                assignments = await make_canvas_request(
                    f"/courses/{course_id}/assignments",
                    {
                        "bucket": "past",
                        "per_page": 100
                    }
                )
                
                for assignment in assignments:
                    due_at = assignment.get('due_at')
                    if not due_at:
                        continue
                    
                    try:
                        due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                        
                        # Make sure all dates are timezone-aware for comparison
                        if today.tzinfo is None:
                            today = today.replace(tzinfo=due_date.tzinfo)
                        
                        # Check if assignment is overdue
                        if due_date < today:
                            assignment_info = {
                                "course_name": course_name,
                                "course_id": course_id,
                                "assignment_name": assignment['name'],
                                "assignment_id": assignment['id'],
                                "due_date": due_date.isoformat(),
                                "due_date_formatted": due_date.strftime("%B %d, %Y at %I:%M %p"),
                                "points_possible": assignment.get('points_possible', 'N/A'),
                                "html_url": assignment.get('html_url', ''),
                                "days_overdue": (today - due_date).days
                            }
                            overdue_assignments.append(assignment_info)
                    except ValueError:
                        continue
                        
            except httpx.HTTPStatusError:
                continue
        
        # Sort by most overdue first
        overdue_assignments.sort(key=lambda x: x['due_date'])
        
        return {
            "success": True,
            "total_overdue": len(overdue_assignments),
            "assignments": overdue_assignments
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "assignments": []
        }

# Make functions available for import
__all__ = ['get_upcoming_assignments', 'get_assignments_by_course', 'get_overdue_assignments']

if __name__ == "__main__":
    mcp.run()