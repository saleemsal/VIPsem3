"""
Additional Canvas MCP Tools
This file contains the remaining tools that couldn't fit in the main canvas_mcp.py file.
"""

import asyncio
import os
import json
import time
import aiofiles
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union
from dateutil import parser as date_parser
from fuzzywuzzy import fuzz
import httpx
from fastmcp import FastMCP

# Import utilities from main file
from canvas_mcp import (
    make_canvas_request, get_all_paginated_data, format_response,
    parse_date_string, calculate_days_until_due, is_overdue
)

# Initialize additional MCP server for additional tools
mcp_additional = FastMCP("Canvas Study Assistant - Additional Tools")

# ============================================================================
# SMART STUDY TOOLS
# ============================================================================

@mcp_additional.tool()
async def identify_test_by_context(date_context: str, subject_hint: str = None) -> Dict[str, Any]:
    """
    Smart test identification from natural language.
    
    Args:
        date_context: Natural language date context (e.g., "Thursday's test", "next week's exam")
        subject_hint: Subject hint (e.g., "calc", "physics")
    
    Returns:
        Dictionary containing the most likely match with confidence score
    """
    start_time = time.time()
    
    try:
        # Parse date context
        target_date = None
        if "thursday" in date_context.lower():
            today = datetime.now(timezone.utc)
            days_ahead = 3 - today.weekday()  # Thursday is 3
            if days_ahead <= 0:
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
        elif "friday" in date_context.lower():
            today = datetime.now(timezone.utc)
            days_ahead = 4 - today.weekday()  # Friday is 4
            if days_ahead <= 0:
                days_ahead += 7
            target_date = today + timedelta(days=days_ahead)
        elif "next week" in date_context.lower():
            target_date = datetime.now(timezone.utc) + timedelta(days=7)
        elif "this week" in date_context.lower():
            target_date = datetime.now(timezone.utc) + timedelta(days=3)
        else:
            target_date = datetime.now(timezone.utc) + timedelta(days=7)
        
        # Calculate search window
        start_date = target_date - timedelta(days=2)
        end_date = target_date + timedelta(days=2)
        
        # Get courses
        courses = await get_all_paginated_data("/courses", {
            "enrollment_state": "active"
        }, cache_ttl=1800)
        
        # Filter courses by subject hint if provided
        if subject_hint:
            subject_hint_lower = subject_hint.lower()
            courses = [c for c in courses if subject_hint_lower in c.get('name', '').lower()]
        
        candidates = []
        
        for course in courses:
            course_id = course['id']
            course_name = course['name']
            
            try:
                # Get assignments
                assignments = await get_all_paginated_data(
                    f"/courses/{course_id}/assignments",
                    {
                        "include[]": ["submission"]
                    },
                    cache_ttl=300
                )
                
                # Get calendar events
                events = await get_all_paginated_data("/calendar_events", {
                    "context_codes": [f"course_{course_id}"],
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                }, cache_ttl=300)
                
                # Check assignments
                test_keywords = ['exam', 'test', 'quiz', 'midterm', 'final', 'assessment']
                
                for assignment in assignments:
                    due_at = assignment.get('due_at')
                    if not due_at:
                        continue
                    
                    due_date = parse_date_string(due_at)
                    if not due_date or not (start_date <= due_date <= end_date):
                        continue
                    
                    title_lower = assignment['title'].lower()
                    if any(keyword in title_lower for keyword in test_keywords):
                        # Calculate confidence score
                        confidence = 0.5  # Base confidence
                        
                        # Boost confidence for exact date match
                        if abs((due_date - target_date).days) <= 1:
                            confidence += 0.3
                        
                        # Boost confidence for subject match
                        if subject_hint and subject_hint_lower in title_lower:
                            confidence += 0.2
                        
                        # Boost confidence for test keywords
                        if any(keyword in title_lower for keyword in ['exam', 'midterm', 'final']):
                            confidence += 0.2
                        
                        candidate = {
                            "id": str(assignment['id']),
                            "name": assignment['title'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "due_at": due_date.isoformat(),
                            "points_possible": assignment.get('points_possible', 0),
                            "type": "assignment",
                            "html_url": assignment.get('html_url', ''),
                            "description": assignment.get('description', ''),
                            "confidence_score": min(confidence, 1.0)
                        }
                        candidates.append(candidate)
                
                # Check calendar events
                for event in events:
                    start_at = event.get('start_at')
                    if not start_at:
                        continue
                    
                    event_date = parse_date_string(start_at)
                    if not event_date or not (start_date <= event_date <= end_date):
                        continue
                    
                    title_lower = event['title'].lower()
                    if any(keyword in title_lower for keyword in test_keywords):
                        # Calculate confidence score
                        confidence = 0.4  # Base confidence for events
                        
                        # Boost confidence for exact date match
                        if abs((event_date - target_date).days) <= 1:
                            confidence += 0.3
                        
                        # Boost confidence for subject match
                        if subject_hint and subject_hint_lower in title_lower:
                            confidence += 0.2
                        
                        candidate = {
                            "id": str(event['id']),
                            "name": event['title'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "due_at": event_date.isoformat(),
                            "points_possible": 0,
                            "type": "event",
                            "html_url": event.get('html_url', ''),
                            "description": event.get('description', ''),
                            "location": event.get('location_name', ''),
                            "confidence_score": min(confidence, 1.0)
                        }
                        candidates.append(candidate)
                        
            except Exception as e:
                print(f"Error processing course {course_id}: {e}")
                continue
        
        # Sort by confidence score
        candidates.sort(key=lambda x: x['confidence_score'], reverse=True)
        
        # Get the best match
        best_match = candidates[0] if candidates else None
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "best_match": best_match,
                "all_candidates": candidates,
                "total_candidates": len(candidates),
                "search_context": {
                    "date_context": date_context,
                    "subject_hint": subject_hint,
                    "target_date": target_date.isoformat(),
                    "search_window": {
                        "start": start_date.isoformat(),
                        "end": end_date.isoformat()
                    }
                }
            },
            metadata={
                "api_calls_made": len(courses) * 2 + 1,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to identify test by context: {str(e)}"
        )

@mcp_additional.tool()
async def gather_study_materials(exam_id: str, course_id: str, weeks_back: int = 4) -> Dict[str, Any]:
    """
    Compile all relevant study materials for an exam.
    
    Args:
        exam_id: Canvas assignment/event ID
        course_id: Canvas course ID
        weeks_back: Number of weeks back to gather materials
    
    Returns:
        Dictionary containing organized study materials
    """
    start_time = time.time()
    
    try:
        # Get exam details
        exam = await make_canvas_request(
            f"/courses/{course_id}/assignments/{exam_id}",
            cache_ttl=300
        )
        
        # Calculate date range
        exam_date = parse_date_string(exam.get('due_at'))
        if not exam_date:
            exam_date = datetime.now() + timedelta(days=7)
        
        start_date = exam_date - timedelta(weeks=weeks_back)
        
        # Get course modules
        modules = await get_all_paginated_data(
            f"/courses/{course_id}/modules",
            {
                "include[]": ["items", "content_details"]
            },
            cache_ttl=1800
        )
        
        # Get course files
        files = await get_all_paginated_data(
            f"/courses/{course_id}/files",
            cache_ttl=1800
        )
        
        # Get announcements
        announcements = await get_all_paginated_data(
            f"/courses/{course_id}/discussion_topics",
            {
                "only_announcements": True,
                "order_by": "posted_at"
            },
            cache_ttl=300
        )
        
        # Get discussions
        discussions = await get_all_paginated_data(
            f"/courses/{course_id}/discussion_topics",
            {
                "order_by": "posted_at"
            },
            cache_ttl=300
        )
        
        # Organize materials
        study_materials = {
            "exam_info": {
                "id": str(exam_id),
                "name": exam['name'],
                "description": exam.get('description', ''),
                "due_at": exam.get('due_at'),
                "points_possible": exam.get('points_possible', 0),
                "html_url": exam.get('html_url', '')
            },
            "modules": [],
            "lecture_files": [],
            "announcements": [],
            "discussions": [],
            "practice_problems": []
        }
        
        # Process modules
        for module in modules:
            if not module.get('name'):
                continue
            
            module_items = []
            for item in module.get('items', []):
                if item.get('type') in ['File', 'Page', 'Assignment', 'Quiz']:
                    module_items.append({
                        "id": str(item['id']),
                        "title": item['title'],
                        "type": item['type'],
                        "url": item.get('url', ''),
                        "html_url": item.get('html_url', ''),
                        "completion_requirement": item.get('completion_requirement', {})
                    })
            
            if module_items:
                study_materials["modules"].append({
                    "id": str(module['id']),
                    "name": module['name'],
                    "items": module_items
                })
        
        # Process files (filter for lecture materials)
        lecture_keywords = ['lecture', 'notes', 'slides', 'presentation', 'class']
        for file in files:
            if not file.get('display_name'):
                continue
            
            file_date = parse_date_string(file.get('created_at'))
            if file_date and file_date >= start_date:
                display_name_lower = file['display_name'].lower()
                if any(keyword in display_name_lower for keyword in lecture_keywords):
                    study_materials["lecture_files"].append({
                        "id": str(file['id']),
                        "name": file['display_name'],
                        "url": file.get('url', ''),
                        "size": file.get('size', 0),
                        "created_at": file.get('created_at'),
                        "content_type": file.get('content-type', '')
                    })
        
        # Process announcements
        for announcement in announcements:
            posted_at = parse_date_string(announcement.get('posted_at'))
            if posted_at and posted_at >= start_date:
                study_materials["announcements"].append({
                    "id": str(announcement['id']),
                    "title": announcement['title'],
                    "message": announcement.get('message', ''),
                    "posted_at": announcement.get('posted_at'),
                    "html_url": announcement.get('html_url', '')
                })
        
        # Process discussions
        for discussion in discussions:
            posted_at = parse_date_string(discussion.get('posted_at'))
            if posted_at and posted_at >= start_date:
                study_materials["discussions"].append({
                    "id": str(discussion['id']),
                    "title": discussion['title'],
                    "message": discussion.get('message', ''),
                    "posted_at": discussion.get('posted_at'),
                    "html_url": discussion.get('html_url', ''),
                    "discussion_type": discussion.get('discussion_type', 'side_comment')
                })
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data=study_materials,
            metadata={
                "api_calls_made": 5,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to gather study materials: {str(e)}"
        )

@mcp_additional.tool()
async def create_study_plan(exam_date: str, course_id: str, hours_available: float = None) -> Dict[str, Any]:
    """
    Generate a personalized study plan.
    
    Args:
        exam_date: Exam date in ISO format
        course_id: Canvas course ID
        hours_available: Available study hours per day (default: auto-calculate)
    
    Returns:
        Dictionary containing day-by-day study schedule
    """
    start_time = time.time()
    
    try:
        # Parse exam date
        exam_datetime = parse_date_string(exam_date)
        if not exam_datetime:
            return format_response(
                success=False,
                error="Invalid exam date format"
            )
        
        # Calculate days until exam
        today = datetime.now(timezone.utc)
        days_until_exam = (exam_datetime - today).days
        
        if days_until_exam <= 0:
            return format_response(
                success=False,
                error="Exam date is in the past"
            )
        
        # Get course information
        course = await make_canvas_request(f"/courses/{course_id}", cache_ttl=1800)
        
        # Get course modules for content organization
        modules = await get_all_paginated_data(
            f"/courses/{course_id}/modules",
            {
                "include[]": ["items"]
            },
            cache_ttl=1800
        )
        
        # Auto-calculate hours if not provided
        if hours_available is None:
            if days_until_exam >= 14:
                hours_available = 2.0  # 2 hours per day for long-term prep
            elif days_until_exam >= 7:
                hours_available = 3.0  # 3 hours per day for medium-term prep
            else:
                hours_available = 4.0  # 4 hours per day for short-term prep
        
        # Organize study topics from modules
        study_topics = []
        for module in modules:
            if not module.get('name'):
                continue
            
            topic = {
                "name": module['name'],
                "items": [],
                "estimated_hours": 0
            }
            
            for item in module.get('items', []):
                if item.get('type') in ['Assignment', 'Quiz', 'Page', 'File']:
                    topic["items"].append({
                        "title": item['title'],
                        "type": item['type'],
                        "url": item.get('url', '')
                    })
            
            # Estimate study time based on number of items
            topic["estimated_hours"] = min(len(topic["items"]) * 0.5, 4.0)
            study_topics.append(topic)
        
        # Create study schedule
        total_available_hours = days_until_exam * hours_available
        total_estimated_hours = sum(topic["estimated_hours"] for topic in study_topics)
        
        # Adjust if needed
        if total_estimated_hours > total_available_hours:
            # Scale down estimated hours
            scale_factor = total_available_hours / total_estimated_hours
            for topic in study_topics:
                topic["estimated_hours"] *= scale_factor
        
        # Distribute topics across days
        study_schedule = []
        current_day = today
        topic_index = 0
        
        for day in range(days_until_exam):
            day_schedule = {
                "date": current_day.strftime("%Y-%m-%d"),
                "day_name": current_day.strftime("%A"),
                "topics": [],
                "total_hours": 0
            }
            
            day_hours_used = 0
            
            while day_hours_used < hours_available and topic_index < len(study_topics):
                topic = study_topics[topic_index]
                remaining_topic_hours = topic["estimated_hours"]
                
                if remaining_topic_hours <= (hours_available - day_hours_used):
                    # Can complete entire topic today
                    day_schedule["topics"].append({
                        "name": topic["name"],
                        "hours": remaining_topic_hours,
                        "items": topic["items"]
                    })
                    day_hours_used += remaining_topic_hours
                    topic_index += 1
                else:
                    # Partial topic today
                    partial_hours = hours_available - day_hours_used
                    day_schedule["topics"].append({
                        "name": topic["name"],
                        "hours": partial_hours,
                        "items": topic["items"][:int(partial_hours * 2)]  # Rough estimate
                    })
                    topic["estimated_hours"] -= partial_hours
                    day_hours_used = hours_available
                    break
            
            day_schedule["total_hours"] = day_hours_used
            study_schedule.append(day_schedule)
            current_day += timedelta(days=1)
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "course_name": course['name'],
                "exam_date": exam_date,
                "days_until_exam": days_until_exam,
                "hours_per_day": hours_available,
                "total_available_hours": total_available_hours,
                "study_schedule": study_schedule,
                "study_topics": study_topics,
                "summary": {
                    "total_days": days_until_exam,
                    "total_topics": len(study_topics),
                    "average_hours_per_day": hours_available
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
            error=f"Failed to create study plan: {str(e)}"
        )

@mcp_additional.tool()
async def get_practice_resources(topic: str, course_id: str = None) -> Dict[str, Any]:
    """
    Find practice problems and resources for a topic.
    
    Args:
        topic: Topic to search for
        course_id: Specific course ID (if None, searches all courses)
    
    Returns:
        Dictionary containing practice resources organized by relevance
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
        
        practice_resources = {
            "topic": topic,
            "assignments": [],
            "quizzes": [],
            "discussions": [],
            "files": [],
            "total_found": 0
        }
        
        topic_lower = topic.lower()
        
        for course in courses:
            course_id = course['id']
            course_name = course['name']
            
            try:
                # Search assignments
                assignments = await get_all_paginated_data(
                    f"/courses/{course_id}/assignments",
                    cache_ttl=300
                )
                
                for assignment in assignments:
                    title_lower = assignment['title'].lower()
                    description_lower = assignment.get('description', '').lower()
                    
                    if topic_lower in title_lower or topic_lower in description_lower:
                        practice_resources["assignments"].append({
                            "id": str(assignment['id']),
                            "title": assignment['title'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "description": assignment.get('description', ''),
                            "points_possible": assignment.get('points_possible', 0),
                            "html_url": assignment.get('html_url', ''),
                            "relevance_score": fuzz.partial_ratio(topic_lower, title_lower) / 100.0
                        })
                
                # Search quizzes
                quizzes = await get_all_paginated_data(
                    f"/courses/{course_id}/quizzes",
                    cache_ttl=300
                )
                
                for quiz in quizzes:
                    title_lower = quiz['title'].lower()
                    description_lower = quiz.get('description', '').lower()
                    
                    if topic_lower in title_lower or topic_lower in description_lower:
                        practice_resources["quizzes"].append({
                            "id": str(quiz['id']),
                            "title": quiz['title'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "description": quiz.get('description', ''),
                            "points_possible": quiz.get('points_possible', 0),
                            "html_url": quiz.get('html_url', ''),
                            "relevance_score": fuzz.partial_ratio(topic_lower, title_lower) / 100.0
                        })
                
                # Search discussions
                discussions = await get_all_paginated_data(
                    f"/courses/{course_id}/discussion_topics",
                    cache_ttl=300
                )
                
                for discussion in discussions:
                    title_lower = discussion['title'].lower()
                    message_lower = discussion.get('message', '').lower()
                    
                    if topic_lower in title_lower or topic_lower in message_lower:
                        practice_resources["discussions"].append({
                            "id": str(discussion['id']),
                            "title": discussion['title'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "message": discussion.get('message', ''),
                            "html_url": discussion.get('html_url', ''),
                            "relevance_score": fuzz.partial_ratio(topic_lower, title_lower) / 100.0
                        })
                
                # Search files
                files = await get_all_paginated_data(
                    f"/courses/{course_id}/files",
                    cache_ttl=1800
                )
                
                for file in files:
                    if not file.get('display_name'):
                        continue
                    
                    filename_lower = file['display_name'].lower()
                    
                    if topic_lower in filename_lower:
                        practice_resources["files"].append({
                            "id": str(file['id']),
                            "name": file['display_name'],
                            "course_name": course_name,
                            "course_id": str(course_id),
                            "url": file.get('url', ''),
                            "size": file.get('size', 0),
                            "content_type": file.get('content-type', ''),
                            "relevance_score": fuzz.partial_ratio(topic_lower, filename_lower) / 100.0
                        })
                        
            except Exception as e:
                print(f"Error searching course {course_id}: {e}")
                continue
        
        # Sort by relevance score
        for resource_type in ["assignments", "quizzes", "discussions", "files"]:
            practice_resources[resource_type].sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Calculate total
        practice_resources["total_found"] = (
            len(practice_resources["assignments"]) +
            len(practice_resources["quizzes"]) +
            len(practice_resources["discussions"]) +
            len(practice_resources["files"])
        )
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data=practice_resources,
            metadata={
                "api_calls_made": len(courses) * 4 + 1,
                "processing_time": processing_time,
                "cache_hit": False
            }
        )
        
    except Exception as e:
        return format_response(
            success=False,
            error=f"Failed to get practice resources: {str(e)}"
        )

# ============================================================================
# GRADE ANALYTICS TOOLS
# ============================================================================

@mcp_additional.tool()
async def get_current_grades(include_what_if: bool = False) -> Dict[str, Any]:
    """
    Get current grades across all courses.
    
    Args:
        include_what_if: Whether to include what-if grade scenarios
    
    Returns:
        Dictionary containing current grades and trends
    """
    start_time = time.time()
    
    try:
        # Get user's enrollments with grades
        enrollments = await get_all_paginated_data("/users/self/enrollments", {
            "type": "StudentEnrollment",
            "include[]": ["current_grading_period_scores", "grades"]
        }, cache_ttl=900)  # Cache for 15 minutes
        
        # Get courses
        courses = await get_all_paginated_data("/courses", {
            "enrollment_state": "active"
        }, cache_ttl=1800)
        
        course_grades = []
        total_points_earned = 0
        total_points_possible = 0
        
        for enrollment in enrollments:
            course_id = enrollment.get('course_id')
            if not course_id:
                continue
            
            # Find course info
            course_info = None
            for course in courses:
                if course['id'] == course_id:
                    course_info = course
                    break
            
            if not course_info:
                continue
            
            # Get grade information
            current_grade = enrollment.get('grades', {})
            current_score = current_grade.get('current_score')
            final_score = current_grade.get('final_score')
            
            # Calculate letter grade
            letter_grade = "N/A"
            if current_score is not None:
                if current_score >= 97:
                    letter_grade = "A+"
                elif current_score >= 93:
                    letter_grade = "A"
                elif current_score >= 90:
                    letter_grade = "A-"
                elif current_score >= 87:
                    letter_grade = "B+"
                elif current_score >= 83:
                    letter_grade = "B"
                elif current_score >= 80:
                    letter_grade = "B-"
                elif current_score >= 77:
                    letter_grade = "C+"
                elif current_score >= 73:
                    letter_grade = "C"
                elif current_score >= 70:
                    letter_grade = "C-"
                elif current_score >= 67:
                    letter_grade = "D+"
                elif current_score >= 63:
                    letter_grade = "D"
                elif current_score >= 60:
                    letter_grade = "D-"
                else:
                    letter_grade = "F"
            
            course_grade_info = {
                "course_id": str(course_id),
                "course_name": course_info['name'],
                "current_score": current_score,
                "final_score": final_score,
                "letter_grade": letter_grade,
                "points_earned": current_grade.get('current_points', 0),
                "points_possible": current_grade.get('possible_points', 0),
                "grade_trend": "stable"  # Could be enhanced with historical data
            }
            
            course_grades.append(course_grade_info)
            
            if current_grade.get('current_points'):
                total_points_earned += current_grade['current_points']
            if current_grade.get('possible_points'):
                total_points_possible += current_grade['possible_points']
        
        # Calculate overall GPA (simplified)
        total_gpa = 0
        courses_with_grades = 0
        for course in course_grades:
            if course['current_score'] is not None:
                # Convert to 4.0 scale (simplified)
                score = course['current_score']
                if score >= 97:
                    gpa_points = 4.0
                elif score >= 93:
                    gpa_points = 4.0
                elif score >= 90:
                    gpa_points = 3.7
                elif score >= 87:
                    gpa_points = 3.3
                elif score >= 83:
                    gpa_points = 3.0
                elif score >= 80:
                    gpa_points = 2.7
                elif score >= 77:
                    gpa_points = 2.3
                elif score >= 73:
                    gpa_points = 2.0
                elif score >= 70:
                    gpa_points = 1.7
                elif score >= 67:
                    gpa_points = 1.3
                elif score >= 63:
                    gpa_points = 1.0
                elif score >= 60:
                    gpa_points = 0.7
                else:
                    gpa_points = 0.0
                
                total_gpa += gpa_points
                courses_with_grades += 1
        
        overall_gpa = total_gpa / courses_with_grades if courses_with_grades > 0 else 0
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "course_grades": course_grades,
                "overall_summary": {
                    "total_courses": len(course_grades),
                    "courses_with_grades": courses_with_grades,
                    "overall_gpa": round(overall_gpa, 2),
                    "total_points_earned": total_points_earned,
                    "total_points_possible": total_points_possible,
                    "overall_percentage": round((total_points_earned / total_points_possible * 100), 2) if total_points_possible > 0 else 0
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
            error=f"Failed to get current grades: {str(e)}"
        )

@mcp_additional.tool()
async def calculate_grade_impact(assignment_id: str, course_id: str, hypothetical_score: float = None) -> Dict[str, Any]:
    """
    Calculate how an assignment affects final grade.
    
    Args:
        assignment_id: Canvas assignment ID
        course_id: Canvas course ID
        hypothetical_score: Hypothetical score to calculate impact for
    
    Returns:
        Dictionary containing grade impact analysis
    """
    start_time = time.time()
    
    try:
        # Get assignment details
        assignment = await make_canvas_request(
            f"/courses/{course_id}/assignments/{assignment_id}",
            {
                "include[]": ["submission"]
            },
            cache_ttl=300
        )
        
        # Get current grade
        enrollment = await make_canvas_request(
            f"/courses/{course_id}/enrollments",
            {
                "type": "StudentEnrollment",
                "include[]": ["grades"]
            },
            cache_ttl=300
        )
        
        if not enrollment:
            return format_response(
                success=False,
                error="No enrollment found for this course"
            )
        
        current_grade = enrollment[0].get('grades', {})
        current_score = current_grade.get('current_score', 0)
        current_points = current_grade.get('current_points', 0)
        possible_points = current_grade.get('possible_points', 0)
        
        # Assignment details
        assignment_points = assignment.get('points_possible', 0)
        submission = assignment.get('submission', {})
        current_assignment_score = submission.get('score', 0) if submission else 0
        
        # Calculate scenarios
        scenarios = {}
        
        # Current grade (if assignment not yet graded)
        if current_assignment_score == 0 and not submission.get('submitted_at'):
            scenarios["current"] = {
                "description": "Current grade (assignment not submitted)",
                "score": current_score,
                "points_earned": current_points,
                "points_possible": possible_points
            }
        else:
            scenarios["current"] = {
                "description": "Current grade (with current assignment score)",
                "score": current_score,
                "points_earned": current_points,
                "points_possible": possible_points
            }
        
        # Perfect score scenario
        if current_assignment_score == 0:
            new_points_earned = current_points + assignment_points
            new_points_possible = possible_points + assignment_points
        else:
            new_points_earned = current_points - current_assignment_score + assignment_points
            new_points_possible = possible_points
        
        new_score = (new_points_earned / new_points_possible * 100) if new_points_possible > 0 else 0
        
        scenarios["perfect_score"] = {
            "description": "Grade if scored 100% on this assignment",
            "score": round(new_score, 2),
            "points_earned": new_points_earned,
            "points_possible": new_points_possible,
            "improvement": round(new_score - current_score, 2)
        }
        
        # Zero score scenario
        if current_assignment_score == 0:
            new_points_earned = current_points
            new_points_possible = possible_points + assignment_points
        else:
            new_points_earned = current_points - current_assignment_score
            new_points_possible = possible_points
        
        new_score = (new_points_earned / new_points_possible * 100) if new_points_possible > 0 else 0
        
        scenarios["zero_score"] = {
            "description": "Grade if scored 0% on this assignment",
            "score": round(new_score, 2),
            "points_earned": new_points_earned,
            "points_possible": new_points_possible,
            "impact": round(new_score - current_score, 2)
        }
        
        # Hypothetical score scenario
        if hypothetical_score is not None:
            hypothetical_points = (hypothetical_score / 100) * assignment_points
            
            if current_assignment_score == 0:
                new_points_earned = current_points + hypothetical_points
                new_points_possible = possible_points + assignment_points
            else:
                new_points_earned = current_points - current_assignment_score + hypothetical_points
                new_points_possible = possible_points
            
            new_score = (new_points_earned / new_points_possible * 100) if new_points_possible > 0 else 0
            
            scenarios["hypothetical"] = {
                "description": f"Grade if scored {hypothetical_score}% on this assignment",
                "score": round(new_score, 2),
                "points_earned": new_points_earned,
                "points_possible": new_points_possible,
                "improvement": round(new_score - current_score, 2)
            }
        
        # Calculate minimum scores for letter grades
        letter_grade_thresholds = {
            "A": 93, "A-": 90, "B+": 87, "B": 83, "B-": 80,
            "C+": 77, "C": 73, "C-": 70, "D+": 67, "D": 63, "D-": 60
        }
        
        minimum_scores = {}
        for grade, threshold in letter_grade_thresholds.items():
            # Calculate minimum assignment score needed
            target_points = (threshold / 100) * new_points_possible
            min_assignment_score = target_points - (current_points - current_assignment_score)
            min_assignment_percentage = (min_assignment_score / assignment_points * 100) if assignment_points > 0 else 0
            
            if 0 <= min_assignment_percentage <= 100:
                minimum_scores[grade] = {
                    "minimum_percentage": round(min_assignment_percentage, 1),
                    "minimum_points": round(min_assignment_score, 1)
                }
        
        processing_time = time.time() - start_time
        
        return format_response(
            success=True,
            data={
                "assignment_info": {
                    "id": str(assignment_id),
                    "name": assignment['name'],
                    "points_possible": assignment_points,
                    "current_score": current_assignment_score,
                    "submitted": bool(submission.get('submitted_at'))
                },
                "current_grade": {
                    "score": current_score,
                    "points_earned": current_points,
                    "points_possible": possible_points
                },
                "scenarios": scenarios,
                "minimum_scores_for_letter_grades": minimum_scores,
                "grade_impact_analysis": {
                    "high_impact": assignment_points > 50,
                    "medium_impact": 20 <= assignment_points <= 50,
                    "low_impact": assignment_points < 20,
                    "assignment_weight": round((assignment_points / new_points_possible * 100), 2) if new_points_possible > 0 else 0
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
            error=f"Failed to calculate grade impact: {str(e)}"
        )

# Make functions available for import
__all__ = [
    'identify_test_by_context', 'gather_study_materials', 'create_study_plan', 'get_practice_resources',
    'get_current_grades', 'calculate_grade_impact'
]

if __name__ == "__main__":
    mcp_additional.run()
