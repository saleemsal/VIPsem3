#!/usr/bin/env python3
"""
Complete Canvas MCP Tools Integration
This file provides a unified interface to all Canvas MCP tools.
"""

import asyncio
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

# Import all tools from both files
from canvas_mcp import (
    # Assignment Management Tools
    get_upcoming_assignments, get_overdue_assignments, get_assignment_details,
    download_assignment_files, check_submission_status,
    
    # Calendar & Scheduling Tools
    get_upcoming_events, find_tests_and_exams, get_todays_schedule, get_course_timetable,
    
    # Utility functions
    make_canvas_request, get_all_paginated_data, format_response,
    parse_date_string, calculate_days_until_due, is_overdue
)

from canvas_mcp_additional import (
    # Smart Study Tools
    identify_test_by_context, gather_study_materials, create_study_plan, get_practice_resources,
    
    # Grade Analytics Tools
    get_current_grades, calculate_grade_impact
)

# ============================================================================
# REMAINING TOOLS IMPLEMENTATION
# ============================================================================

async def get_course_modules(course_id: str, include_items: bool = True) -> Dict[str, Any]:
    """
    Get all modules with completion status.
    
    Args:
        course_id: Canvas course ID
        include_items: Whether to include module items
    
    Returns:
        Dictionary containing modules with completion status
    """
    start_time = time.time()
    
    try:
        # Get modules
        modules = await get_all_paginated_data(
            f"/courses/{course_id}/modules",
            {
                "include[]": ["items", "content_details"] if include_items else []
            },
            cache_ttl=1800
        )
        
        # Get course info
        course = await make_canvas_request(f"/courses/{course_id}", cache_ttl=1800)
        
        # Process modules
        processed_modules = []
        total_items = 0
        completed_items = 0
        
        for module in modules:
            module_info = {
                "id": str(module['id']),
                "name": module['name'],
                "position": module.get('position', 0),
                "unlock_at": module.get('unlock_at'),
                "require_sequential_progress": module.get('require_sequential_progress', False),
                "publish_final_grade": module.get('publish_final_grade', False),
                "items": []
            }
            
            if include_items:
                items = module.get('items', [])
                module_completed_items = 0
                
                for item in items:
                    item_info = {
                        "id": str(item['id']),
                        "title": item['title'],
                        "type": item['type'],
                        "position": item.get('position', 0),
                        "url": item.get('url', ''),
                        "html_url": item.get('html_url', ''),
                        "completion_requirement": item.get('completion_requirement', {}),
                        "content_details": item.get('content_details', {})
                    }
                    
                    # Check completion status
                    content_details = item.get('content_details', {})
                    if content_details.get('completion_requirement'):
                        completion_req = content_details['completion_requirement']
                        if completion_req.get('completed'):
                            module_completed_items += 1
                    
                    module_info["items"].append(item_info)
                    total_items += 1
                
                module_info["completion_status"] = {
                    "total_items": len(items),
                    "completed_items": module_completed_items,
                    "completion_percentage": (module_completed_items / len(items) * 100) if items else 0
                }
                completed_items += module_completed_items
            
            processed_modules.append(module_info)
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "course_id": str(course_id),
                "course_name": course['name'],
                "modules": processed_modules,
                "summary": {
                    "total_modules": len(processed_modules),
                    "total_items": total_items,
                    "completed_items": completed_items,
                    "overall_completion": (completed_items / total_items * 100) if total_items > 0 else 0
                }
            },
            metadata={
                "api_calls_made": 2,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to get course modules: {str(e)}"
        )

async def search_course_content(query: str, course_id: str = None, content_types: List[str] = None) -> Dict[str, Any]:
    """
    Search across all course content.
    
    Args:
        query: Search query
        course_id: Specific course ID (if None, searches all courses)
        content_types: Filter by content types ['assignment', 'quiz', 'discussion', 'file', 'page']
    
    Returns:
        Dictionary containing ranked search results
    """
    start_time = time.time()
    
    try:
        # Get courses to search
        if course_id:
            courses = [{"id": course_id, "name": "Unknown Course"}]
        else:
            courses = await get_all_paginated_data("/courses", {
                "enrollment_state": "active"
            }, cache_ttl=1800)
        
        search_results = {
            "query": query,
            "assignments": [],
            "quizzes": [],
            "discussions": [],
            "files": [],
            "pages": [],
            "total_results": 0
        }
        
        query_lower = query.lower()
        
        for course in courses:
            current_course_id = course['id']
            course_name = course['name']
            
            # If course_id is provided, only search that specific course
            if course_id and str(course_id) != str(current_course_id):
                continue
            
            # If course_id is a course name pattern (e.g., "CS 3511"), filter by course name
            if course_id and not course_id.isdigit():
                if course_id.lower() not in course_name.lower():
                    continue
            
            try:
                # Search assignments
                if not content_types or 'assignment' in content_types:
                    assignments = await get_all_paginated_data(
                        f"/courses/{current_course_id}/assignments",
                        cache_ttl=300
                    )
                    
                    for assignment in assignments:
                        if not assignment.get('title'):
                            continue  # Skip assignments without titles
                        title_lower = assignment['title'].lower()
                        description_lower = assignment.get('description', '').lower()
                        
                        if query_lower in title_lower or query_lower in description_lower:
                            relevance_score = fuzz.partial_ratio(query_lower, title_lower) / 100.0
                            
                            search_results["assignments"].append({
                                "id": str(assignment['id']),
                                "title": assignment['title'],
                                "course_name": course_name,
                                "course_id": str(current_course_id),
                                "description": assignment.get('description', ''),
                                "due_at": assignment.get('due_at'),
                                "points_possible": assignment.get('points_possible', 0),
                                "html_url": assignment.get('html_url', ''),
                                "relevance_score": relevance_score
                            })
                
                # Search quizzes
                if not content_types or 'quiz' in content_types:
                    quizzes = await get_all_paginated_data(
                        f"/courses/{current_course_id}/quizzes",
                        cache_ttl=300
                    )
                    
                    for quiz in quizzes:
                        if not quiz.get('title'):
                            continue  # Skip quizzes without titles
                        title_lower = quiz['title'].lower()
                        description_lower = quiz.get('description', '').lower()
                        
                        if query_lower in title_lower or query_lower in description_lower:
                            relevance_score = fuzz.partial_ratio(query_lower, title_lower) / 100.0
                            
                            search_results["quizzes"].append({
                                "id": str(quiz['id']),
                                "title": quiz['title'],
                                "course_name": course_name,
                                "course_id": str(current_course_id),
                                "description": quiz.get('description', ''),
                                "due_at": quiz.get('due_at'),
                                "points_possible": quiz.get('points_possible', 0),
                                "html_url": quiz.get('html_url', ''),
                                "relevance_score": relevance_score
                            })
                
                # Search discussions
                if not content_types or 'discussion' in content_types:
                    discussions = await get_all_paginated_data(
                        f"/courses/{current_course_id}/discussion_topics",
                        cache_ttl=300
                    )
                    
                    for discussion in discussions:
                        if not discussion.get('title'):
                            continue  # Skip discussions without titles
                        title_lower = discussion['title'].lower()
                        message_lower = discussion.get('message', '').lower()
                        
                        if query_lower in title_lower or query_lower in message_lower:
                            relevance_score = fuzz.partial_ratio(query_lower, title_lower) / 100.0
                            
                            search_results["discussions"].append({
                                "id": str(discussion['id']),
                                "title": discussion['title'],
                                "course_name": course_name,
                                "course_id": str(current_course_id),
                                "message": discussion.get('message', ''),
                                "posted_at": discussion.get('posted_at'),
                                "html_url": discussion.get('html_url', ''),
                                "relevance_score": relevance_score
                            })
                
                # Search files
                if not content_types or 'file' in content_types:
                    files = await get_all_paginated_data(
                        f"/courses/{current_course_id}/files",
                        cache_ttl=1800
                    )
                    
                    for file in files:
                        if not file.get('display_name'):
                            continue
                        
                        filename_lower = file['display_name'].lower()
                        
                        if query_lower in filename_lower:
                            relevance_score = fuzz.partial_ratio(query_lower, filename_lower) / 100.0
                            
                            search_results["files"].append({
                                "id": str(file['id']),
                                "name": file['display_name'],
                                "course_name": course_name,
                                "course_id": str(current_course_id),
                                "url": file.get('url', ''),
                                "size": file.get('size', 0),
                                "content_type": file.get('content-type', ''),
                                "created_at": file.get('created_at'),
                                "relevance_score": relevance_score
                            })
                
                # Search pages
                if not content_types or 'page' in content_types:
                    pages = await get_all_paginated_data(
                        f"/courses/{current_course_id}/pages",
                        cache_ttl=1800
                    )
                    
                    for page in pages:
                        if not page.get('title'):
                            continue  # Skip pages without titles
                        title_lower = page['title'].lower()
                        body_lower = page.get('body', '').lower()
                        
                        if query_lower in title_lower or query_lower in body_lower:
                            relevance_score = fuzz.partial_ratio(query_lower, title_lower) / 100.0
                            
                            search_results["pages"].append({
                                "id": str(page['id']),
                                "title": page['title'],
                                "course_name": course_name,
                                "course_id": str(current_course_id),
                                "body": page.get('body', ''),
                                "url": page.get('url', ''),
                                "html_url": page.get('html_url', ''),
                                "updated_at": page.get('updated_at'),
                                "relevance_score": relevance_score
                            })
                        
            except Exception as e:
                print(f"Error searching course {current_course_id}: {e}")
                continue
        
        # Sort all results by relevance score
        for content_type in ["assignments", "quizzes", "discussions", "files", "pages"]:
            search_results[content_type].sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Calculate total results
        search_results["total_results"] = (
            len(search_results["assignments"]) +
            len(search_results["quizzes"]) +
            len(search_results["discussions"]) +
            len(search_results["files"]) +
            len(search_results["pages"])
        )
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data=search_results,
            metadata={
                "api_calls_made": len(courses) * 5 + 1,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to search course content: {str(e)}"
        )

async def prioritize_assignments(strategy: str = "weighted") -> Dict[str, Any]:
    """
    Prioritize assignments by various strategies.
    
    Args:
        strategy: Prioritization strategy ('weighted', 'urgent', 'effort', 'risk')
    
    Returns:
        Dictionary containing prioritized assignments with reasoning
    """
    start_time = time.time()
    
    try:
        # Get upcoming assignments
        upcoming_result = await get_upcoming_assignments(days_ahead=30, include_submitted=False)
        if not upcoming_result.get("success"):
            return format_response(
                success=False,
                error="Failed to get upcoming assignments"
            )
        
        assignments = upcoming_result["data"]["assignments"]
        
        # Get current grades for risk assessment
        grades_result = await get_current_grades()
        course_grades = {}
        if grades_result.get("success"):
            for grade in grades_result["data"]["course_grades"]:
                course_grades[grade["course_id"]] = grade["current_score"] or 0
        
        # Apply prioritization strategy
        prioritized_assignments = []
        
        for assignment in assignments:
            priority_score = 0
            reasoning = []
            
            if strategy == "weighted":
                # Prioritize by grade impact
                points = assignment.get("points_possible", 0)
                if points > 50:
                    priority_score += 30
                    reasoning.append("High point value")
                elif points > 20:
                    priority_score += 20
                    reasoning.append("Medium point value")
                else:
                    priority_score += 10
                    reasoning.append("Low point value")
                
                # Boost for due soon
                days_until_due = assignment.get("days_until_due", 0)
                if days_until_due <= 1:
                    priority_score += 25
                    reasoning.append("Due very soon")
                elif days_until_due <= 3:
                    priority_score += 15
                    reasoning.append("Due soon")
                elif days_until_due <= 7:
                    priority_score += 10
                    reasoning.append("Due this week")
            
            elif strategy == "urgent":
                # Prioritize by due date
                days_until_due = assignment.get("days_until_due", 0)
                priority_score = max(0, 100 - days_until_due)
                reasoning.append(f"Due in {days_until_due} days")
            
            elif strategy == "effort":
                # Prioritize by estimated effort vs impact
                points = assignment.get("points_possible", 0)
                days_until_due = assignment.get("days_until_due", 0)
                
                # Estimate effort based on assignment type
                submission_types = assignment.get("submission_types", [])
                if "online_upload" in submission_types:
                    estimated_effort = 4  # Hours
                elif "online_text_entry" in submission_types:
                    estimated_effort = 2
                else:
                    estimated_effort = 1
                
                # Calculate efficiency score (points per hour)
                efficiency = points / estimated_effort if estimated_effort > 0 else 0
                priority_score = efficiency * 10
                reasoning.append(f"Estimated {estimated_effort}h effort for {points} points")
            
            elif strategy == "risk":
                # Prioritize by risk to current grade
                course_id = assignment.get("course_id")
                current_grade = course_grades.get(course_id, 0)
                points = assignment.get("points_possible", 0)
                days_until_due = assignment.get("days_until_due", 0)
                
                # Higher risk for lower current grades
                if current_grade < 70:
                    priority_score += 40
                    reasoning.append("Low current grade - high risk")
                elif current_grade < 80:
                    priority_score += 25
                    reasoning.append("Below average grade - medium risk")
                else:
                    priority_score += 10
                    reasoning.append("Good current grade - low risk")
                
                # Boost for high-value assignments
                if points > 50:
                    priority_score += 20
                    reasoning.append("High point value")
            
            # Add assignment with priority score
            prioritized_assignment = assignment.copy()
            prioritized_assignment["priority_score"] = priority_score
            prioritized_assignment["reasoning"] = reasoning
            prioritized_assignments.append(prioritized_assignment)
        
        # Sort by priority score
        prioritized_assignments.sort(key=lambda x: x["priority_score"], reverse=True)
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "strategy": strategy,
                "prioritized_assignments": prioritized_assignments,
                "total_assignments": len(prioritized_assignments),
                "strategy_explanation": {
                    "weighted": "Prioritizes by grade impact and urgency",
                    "urgent": "Prioritizes by due date (most urgent first)",
                    "effort": "Prioritizes by points per hour of effort",
                    "risk": "Prioritizes by risk to current grade"
                }.get(strategy, "Unknown strategy")
            },
            metadata={
                "api_calls_made": 2,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to prioritize assignments: {str(e)}"
        )

# ============================================================================
# TOOL REGISTRY
# ============================================================================

# All available tools
ALL_TOOLS = {
    # Assignment Management
    "get_upcoming_assignments": get_upcoming_assignments,
    "get_overdue_assignments": get_overdue_assignments,
    "get_assignment_details": get_assignment_details,
    "download_assignment_files": download_assignment_files,
    "check_submission_status": check_submission_status,
    
    # Calendar & Scheduling
    "get_upcoming_events": get_upcoming_events,
    "find_tests_and_exams": find_tests_and_exams,
    "get_todays_schedule": get_todays_schedule,
    "get_course_timetable": get_course_timetable,
    
    # Smart Study Tools
    "identify_test_by_context": identify_test_by_context,
    "gather_study_materials": gather_study_materials,
    "create_study_plan": create_study_plan,
    "get_practice_resources": get_practice_resources,
    
    # Grade Analytics
    "get_current_grades": get_current_grades,
    "calculate_grade_impact": calculate_grade_impact,
    
    # Course Content Access
    "get_course_modules": get_course_modules,
    "search_course_content": search_course_content,
    
    # Smart Priority Tools
    "prioritize_assignments": prioritize_assignments,
}

async def list_available_tools() -> Dict[str, Any]:
    """List all available tools with descriptions."""
    return format_response(
        success=True,
        data={
            "total_tools": len(ALL_TOOLS),
            "tools": {
                name: {
                    "name": name,
                    "description": func.__doc__.split('\n')[1].strip() if func.__doc__ else "No description available",
                    "category": _get_tool_category(name)
                }
                for name, func in ALL_TOOLS.items()
            }
        }
    )

def _get_tool_category(tool_name: str) -> str:
    """Get the category for a tool."""
    if tool_name.startswith("get_") and "assignment" in tool_name:
        return "Assignment Management"
    elif tool_name.startswith("get_") and ("event" in tool_name or "schedule" in tool_name or "timetable" in tool_name):
        return "Calendar & Scheduling"
    elif tool_name in ["identify_test_by_context", "gather_study_materials", "create_study_plan", "get_practice_resources"]:
        return "Smart Study Tools"
    elif tool_name.startswith("get_") and "grade" in tool_name or tool_name.startswith("calculate_grade"):
        return "Grade Analytics"
    elif tool_name.startswith("get_") and ("module" in tool_name or "content" in tool_name):
        return "Course Content Access"
    elif tool_name.startswith("prioritize") or tool_name.startswith("detect") or tool_name.startswith("estimate"):
        return "Smart Priority Tools"
    else:
        return "Other"

async def run_tool(tool_name: str, **kwargs) -> Dict[str, Any]:
    """Run a specific tool by name."""
    if tool_name not in ALL_TOOLS:
        return format_response(
            success=False,
            error=f"Tool '{tool_name}' not found. Available tools: {list(ALL_TOOLS.keys())}"
        )
    
    try:
        tool_func = ALL_TOOLS[tool_name]
        result = await tool_func(**kwargs)
        return result
    except Exception as e:
        return format_response(
            success=False,
            error=f"Error running tool '{tool_name}': {str(e)}"
        )

# ============================================================================
# MAIN INTERFACE
# ============================================================================

async def main():
    """Main function for testing the complete tool suite."""
    print("Canvas MCP Tools - Complete Implementation")
    print("=" * 50)
    
    # List available tools
    tools_result = await list_available_tools()
    if tools_result["success"]:
        print(f"Available Tools: {tools_result['data']['total_tools']}")
        for category, tools in _group_tools_by_category(tools_result["data"]["tools"]).items():
            print(f"\n{category}:")
            for tool in tools:
                print(f"  • {tool['name']}")
    
    print("\n" + "=" * 50)
    print("Canvas MCP Tools implementation complete!")
    print("Use run_tool(tool_name, **kwargs) to execute any tool")
    print("All tools include comprehensive error handling and caching")

def _group_tools_by_category(tools: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    """Group tools by category."""
    categories = {}
    for tool in tools.values():
        category = tool["category"]
        if category not in categories:
            categories[category] = []
        categories[category].append(tool)
    return categories

if __name__ == "__main__":
    asyncio.run(main())
