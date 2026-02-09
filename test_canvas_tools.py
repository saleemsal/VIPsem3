#!/usr/bin/env python3
"""
Test suite for Canvas MCP Tools
Tests the functionality of all implemented Canvas tools.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from typing import Dict, Any
import json

# Add the current directory to the path so we can import canvas_mcp
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

import canvas_mcp

class CanvasToolsTester:
    """Test suite for Canvas MCP tools."""
    
    def __init__(self):
        """Initialize the tester."""
        self.test_results = []
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test_result(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log the result of a test."""
        result = {
            "test_name": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)
        
        if success:
            self.passed_tests += 1
            print(f"PASS {test_name}: {message}")
        else:
            self.failed_tests += 1
            print(f"FAIL {test_name}: {message}")
    
    async def test_environment_setup(self):
        """Test that environment variables are properly set."""
        test_name = "Environment Setup"
        
        try:
            canvas_api_key = os.getenv("CANVAS_API_KEY")
            canvas_base_url = os.getenv("CANVAS_BASE_URL", "https://gatech.instructure.com")
            
            if not canvas_api_key:
                self.log_test_result(test_name, False, "CANVAS_API_KEY not set")
                return False
            
            self.log_test_result(test_name, True, f"Environment configured - Base URL: {canvas_base_url}")
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Environment setup failed: {str(e)}")
            return False
    
    async def test_get_upcoming_assignments(self):
        """Test the get_upcoming_assignments tool."""
        test_name = "Get Upcoming Assignments"
        
        try:
            result = await canvas_mcp.get_upcoming_assignments(days_ahead=7, include_submitted=False)
            
            # Check response structure
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            assignments = data.get("assignments", [])
            
            self.log_test_result(
                test_name, 
                True, 
                f"Found {len(assignments)} upcoming assignments",
                {"total_assignments": len(assignments), "total_points": data.get("total_points", 0)}
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_get_overdue_assignments(self):
        """Test the get_overdue_assignments tool."""
        test_name = "Get Overdue Assignments"
        
        try:
            result = await canvas_mcp.get_overdue_assignments()
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            assignments = data.get("assignments", [])
            summary = data.get("summary", {})
            
            self.log_test_result(
                test_name, 
                True, 
                f"Found {len(assignments)} overdue assignments",
                {
                    "total_overdue": len(assignments),
                    "total_points_lost": data.get("total_points_lost", 0),
                    "high_impact": summary.get("high_impact", 0),
                    "medium_impact": summary.get("medium_impact", 0),
                    "low_impact": summary.get("low_impact", 0)
                }
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_get_upcoming_events(self):
        """Test the get_upcoming_events tool."""
        test_name = "Get Upcoming Events"
        
        try:
            result = await canvas_mcp.get_upcoming_events(days_ahead=7)
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            events = data.get("events", [])
            categorized = data.get("categorized_events", {})
            summary = data.get("summary", {})
            
            self.log_test_result(
                test_name, 
                True, 
                f"Found {len(events)} upcoming events",
                {
                    "total_events": len(events),
                    "assignments": summary.get("assignments", 0),
                    "quizzes": summary.get("quizzes", 0),
                    "exams": summary.get("exams", 0),
                    "classes": summary.get("classes", 0)
                }
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_find_tests_and_exams(self):
        """Test the find_tests_and_exams tool."""
        test_name = "Find Tests and Exams"
        
        try:
            result = await canvas_mcp.find_tests_and_exams(search_date="next week")
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            tests = data.get("tests_and_exams", [])
            summary = data.get("summary", {})
            
            self.log_test_result(
                test_name, 
                True, 
                f"Found {len(tests)} tests/exams",
                {
                    "total_tests": len(tests),
                    "assignments": summary.get("assignments", 0),
                    "events": summary.get("events", 0),
                    "high_confidence": summary.get("high_confidence", 0)
                }
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_get_todays_schedule(self):
        """Test the get_todays_schedule tool."""
        test_name = "Get Today's Schedule"
        
        try:
            result = await canvas_mcp.get_todays_schedule()
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            events = data.get("events", [])
            assignments = data.get("assignments", [])
            summary = data.get("summary", {})
            
            self.log_test_result(
                test_name, 
                True, 
                f"Today has {len(events)} events and {len(assignments)} assignments",
                {
                    "date": data.get("date", ""),
                    "total_events": len(events),
                    "total_assignments": len(assignments),
                    "classes": summary.get("classes", 0),
                    "office_hours": summary.get("office_hours", 0)
                }
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_get_course_timetable(self):
        """Test the get_course_timetable tool."""
        test_name = "Get Course Timetable"
        
        try:
            result = await canvas_mcp.get_course_timetable()
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            if not result.get("success"):
                self.log_test_result(test_name, False, f"Tool failed: {result.get('error', {}).get('message', 'Unknown error')}")
                return False
            
            data = result.get("data", {})
            course_schedules = data.get("course_schedules", [])
            
            self.log_test_result(
                test_name, 
                True, 
                f"Found timetables for {len(course_schedules)} courses",
                {
                    "total_courses": len(course_schedules),
                    "total_events": data.get("total_events", 0)
                }
            )
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_response_format_consistency(self):
        """Test that all tools return consistent response formats."""
        test_name = "Response Format Consistency"
        
        try:
            # Test multiple tools to check response format consistency
            tools_to_test = [
                ("get_upcoming_assignments", lambda: canvas_mcp.get_upcoming_assignments(days_ahead=1)),
                ("get_overdue_assignments", lambda: canvas_mcp.get_overdue_assignments()),
                ("get_upcoming_events", lambda: canvas_mcp.get_upcoming_events(days_ahead=1)),
                ("get_todays_schedule", lambda: canvas_mcp.get_todays_schedule())
            ]
            
            format_issues = []
            
            for tool_name, tool_func in tools_to_test:
                try:
                    result = await tool_func()
                    
                    # Check required fields
                    if not isinstance(result, dict):
                        format_issues.append(f"{tool_name}: Response is not a dictionary")
                        continue
                    
                    if "success" not in result:
                        format_issues.append(f"{tool_name}: Missing 'success' field")
                        continue
                    
                    if "timestamp" not in result:
                        format_issues.append(f"{tool_name}: Missing 'timestamp' field")
                        continue
                    
                    if result["success"]:
                        if "data" not in result:
                            format_issues.append(f"{tool_name}: Missing 'data' field for successful response")
                    else:
                        if "error" not in result:
                            format_issues.append(f"{tool_name}: Missing 'error' field for failed response")
                    
                    # Check metadata field (optional but should be consistent)
                    if "metadata" in result:
                        metadata = result["metadata"]
                        if not isinstance(metadata, dict):
                            format_issues.append(f"{tool_name}: 'metadata' field is not a dictionary")
                        else:
                            if "api_calls_made" not in metadata:
                                format_issues.append(f"{tool_name}: Missing 'api_calls_made' in metadata")
                            if "processing_time" not in metadata:
                                format_issues.append(f"{tool_name}: Missing 'processing_time' in metadata")
                
                except Exception as e:
                    format_issues.append(f"{tool_name}: Exception during test: {str(e)}")
            
            if format_issues:
                self.log_test_result(test_name, False, f"Format issues found: {'; '.join(format_issues)}")
                return False
            else:
                self.log_test_result(test_name, True, "All tools return consistent response formats")
                return True
                
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def test_error_handling(self):
        """Test error handling with invalid parameters."""
        test_name = "Error Handling"
        
        try:
            # Test with invalid course ID
            result = await canvas_mcp.get_assignment_details("invalid_id", "invalid_course")
            
            if not isinstance(result, dict):
                self.log_test_result(test_name, False, "Response is not a dictionary")
                return False
            
            # Should fail gracefully
            if result.get("success"):
                self.log_test_result(test_name, False, "Expected failure but got success")
                return False
            
            error = result.get("error", {})
            if not error.get("message"):
                self.log_test_result(test_name, False, "Error response missing message")
                return False
            
            self.log_test_result(test_name, True, f"Error handled gracefully: {error.get('message', '')[:50]}...")
            return True
            
        except Exception as e:
            self.log_test_result(test_name, False, f"Test failed with exception: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """Run all tests."""
        print("🧪 Starting Canvas MCP Tools Test Suite")
        print("=" * 50)
        
        # Check environment first
        env_ok = await self.test_environment_setup()
        if not env_ok:
            print("\nFAIL: Environment setup failed. Please check your CANVAS_API_KEY.")
            return
        
        # Run all tests
        tests = [
            self.test_get_upcoming_assignments,
            self.test_get_overdue_assignments,
            self.test_get_upcoming_events,
            self.test_find_tests_and_exams,
            self.test_get_todays_schedule,
            self.test_get_course_timetable,
            self.test_response_format_consistency,
            self.test_error_handling
        ]
        
        for test in tests:
            try:
                await test()
            except Exception as e:
                print(f"FAIL: Test {test.__name__} crashed: {str(e)}")
                self.failed_tests += 1
        
        # Print summary
        print("\n" + "=" * 50)
        print("Test Summary")
        print("=" * 50)
        print(f"PASSED: {self.passed_tests}")
        print(f"FAILED: {self.failed_tests}")
        print(f"SUCCESS RATE: {(self.passed_tests / (self.passed_tests + self.failed_tests) * 100):.1f}%")
        
        # Save detailed results
        results_file = "test_results.json"
        with open(results_file, 'w') as f:
            json.dump({
                "summary": {
                    "passed": self.passed_tests,
                    "failed": self.failed_tests,
                    "success_rate": self.passed_tests / (self.passed_tests + self.failed_tests) * 100,
                    "timestamp": datetime.now().isoformat()
                },
                "detailed_results": self.test_results
            }, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {results_file}")

async def main():
    """Main function to run the test suite."""
    tester = CanvasToolsTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())

