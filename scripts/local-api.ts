import { createServer } from 'http';
import chatHandler from '../api/chat';
import practiceHandler from '../api/generate-practice';
import chainReasoningHandler from '../api/chain-reasoning';
import { handler as compareModelsHandler } from '../api/compare-models';
import { handler as logPreferenceHandler } from '../api/log-preference';
import feedbackHandler from '../api/feedback';
import localAuthHandler from '../api/auth-local';

type CanvasConn = {
  apiUrl: string;
  apiKey: string;
};

let canvasConn: CanvasConn | null = null;

// Canvas API helper
async function canvasApiRequest(endpoint: string, params?: Record<string, any>): Promise<any> {
  if (!canvasConn) {
    throw new Error('Canvas not connected. Please connect Canvas first.');
  }

  const url = new URL(`${canvasConn.apiUrl}/api/v1${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${canvasConn.apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Canvas API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

// Get all paginated data from Canvas API
async function getAllPaginatedData(endpoint: string, params?: Record<string, any>): Promise<any[]> {
  const allData: any[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const pageParams = { ...params, page, per_page: perPage };
    const data = await canvasApiRequest(endpoint, pageParams);
    
    if (Array.isArray(data)) {
      allData.push(...data);
      if (data.length < perPage) break;
      page++;
    } else {
      allData.push(data);
      break;
    }
  }

  return allData;
}

// Canvas Tools Implementation
const canvasTools = {
  get_current_grades: {
    name: 'get_current_grades',
    description: 'Get current grades across all courses with GPA calculation',
    category: 'Grade Analytics',
    handler: async (args: Record<string, any> = {}) => {
      const courses = await getAllPaginatedData('/courses', { enrollment_type: 'student', enrollment_state: 'active' });
      const grades = [];

      for (const course of courses) {
        try {
          const enrollments = await canvasApiRequest(`/courses/${course.id}/enrollments`, {
            user_id: 'self',
            type: 'StudentEnrollment',
          });

          for (const enrollment of Array.isArray(enrollments) ? enrollments : [enrollments]) {
            const gradeData = enrollment.grades || {};
            grades.push({
              course_id: course.id,
              course_name: course.name,
              course_code: course.course_code,
              current_grade: gradeData.current_grade || gradeData.current_score || null,
              current_score: gradeData.current_score || null,
              final_grade: gradeData.final_grade || null,
              unposted_current_grade: gradeData.unposted_current_grade || null,
            });
          }
        } catch (e) {
          console.error(`Error getting grades for course ${course.id}:`, e);
        }
      }

      // Calculate GPA (simplified - assumes 4.0 scale)
      const numericGrades = grades
        .map(g => {
          const grade = g.current_grade || g.final_grade;
          if (!grade) return null;
          
          // If grade is already a number, use it directly
          if (typeof grade === 'number') {
            return grade;
          }
          
          // Convert string grades to numbers
          const gradeStr = String(grade).trim();
          const gradeMap: Record<string, number> = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0,
          };
          
          // Try letter grade first, then numeric
          const upperGrade = gradeStr.toUpperCase();
          if (gradeMap[upperGrade] !== undefined) {
            return gradeMap[upperGrade];
          }
          
          // Try parsing as number
          const numeric = parseFloat(gradeStr);
          if (!isNaN(numeric)) {
            return numeric;
          }
          
          return null;
        })
        .filter((g): g is number => g !== null);

      const gpa = numericGrades.length > 0
        ? numericGrades.reduce((sum, g) => sum + g, 0) / numericGrades.length
        : null;

      return {
        success: true,
        data: {
          grades,
          gpa: gpa ? gpa.toFixed(2) : null,
          total_courses: grades.length,
        },
      };
    },
  },

  get_todays_schedule: {
    name: 'get_todays_schedule',
    description: 'Get today\'s schedule including assignments, events, and calendar items',
    category: 'Calendar & Scheduling',
    handler: async (args: Record<string, any> = {}) => {
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      // Get calendar events
      const events = await getAllPaginatedData('/calendar_events', {
        start_date: startOfDay.toISOString(),
        end_date: endOfDay.toISOString(),
        type: 'event',
      });

      // Get assignments due today
      const courses = await getAllPaginatedData('/courses', { enrollment_type: 'student', enrollment_state: 'active' });
      const assignmentsDueToday = [];

      for (const course of courses) {
        try {
          const assignments = await getAllPaginatedData(`/courses/${course.id}/assignments`, {
            bucket: 'upcoming',
          });

          for (const assignment of assignments) {
            if (assignment.due_at) {
              const dueDate = new Date(assignment.due_at);
              if (dueDate >= startOfDay && dueDate <= endOfDay) {
                assignmentsDueToday.push({
                  id: assignment.id,
                  name: assignment.name,
                  course_id: course.id,
                  course_name: course.name,
                  due_at: assignment.due_at,
                  points_possible: assignment.points_possible,
                  submission_types: assignment.submission_types,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error getting assignments for course ${course.id}:`, e);
        }
      }

      return {
        success: true,
        data: {
          date: startOfDay.toISOString().split('T')[0],
          events: events.map((e: any) => ({
            id: e.id,
            title: e.title,
            start_at: e.start_at,
            end_at: e.end_at,
            location_name: e.location_name,
            context_code: e.context_code,
          })),
          assignments: assignmentsDueToday,
          total_events: events.length,
          total_assignments: assignmentsDueToday.length,
        },
      };
    },
  },

  get_upcoming_assignments: {
    name: 'get_upcoming_assignments',
    description: 'Get upcoming assignments with due dates',
    category: 'Assignment Management',
    handler: async (args: Record<string, any> = {}) => {
      const daysAhead = args.days_ahead || 30;
      const includeSubmitted = args.include_submitted !== false;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const courses = await getAllPaginatedData('/courses', { enrollment_type: 'student', enrollment_state: 'active' });
      const assignments = [];

      for (const course of courses) {
        try {
          const courseAssignments = await getAllPaginatedData(`/courses/${course.id}/assignments`, {
            bucket: 'upcoming',
          });

          for (const assignment of courseAssignments) {
            if (assignment.due_at) {
              const dueDate = new Date(assignment.due_at);
              if (dueDate <= endDate) {
                // Check submission status
                let submission = null;
                if (!includeSubmitted) {
                  try {
                    const submissions = await canvasApiRequest(`/courses/${course.id}/assignments/${assignment.id}/submissions`, {
                      student_id: 'self',
                    });
                    submission = Array.isArray(submissions) ? submissions[0] : submissions;
                  } catch (e) {
                    // Submission check failed, include anyway
                  }
                }

                if (includeSubmitted || !submission || submission.workflow_state !== 'submitted') {
                  assignments.push({
                    id: assignment.id,
                    name: assignment.name,
                    course_id: course.id,
                    course_name: course.name,
                    course_code: course.course_code,
                    due_at: assignment.due_at,
                    points_possible: assignment.points_possible,
                    submission_types: assignment.submission_types,
                    has_submitted: submission?.workflow_state === 'submitted',
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error getting assignments for course ${course.id}:`, e);
        }
      }

      // Sort by due date
      assignments.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

      return {
        success: true,
        data: {
          assignments,
          total: assignments.length,
          days_ahead: daysAhead,
        },
      };
    },
  },

  get_overdue_assignments: {
    name: 'get_overdue_assignments',
    description: 'Get all overdue assignments',
    category: 'Assignment Management',
    handler: async (args: Record<string, any> = {}) => {
      const now = new Date();
      const courses = await getAllPaginatedData('/courses', { enrollment_type: 'student', enrollment_state: 'active' });
      const overdueAssignments = [];

      for (const course of courses) {
        try {
          const assignments = await getAllPaginatedData(`/courses/${course.id}/assignments`, {
            bucket: 'past',
          });

          for (const assignment of assignments) {
            if (assignment.due_at) {
              const dueDate = new Date(assignment.due_at);
              if (dueDate < now) {
                // Check if submitted
                let submission = null;
                try {
                  const submissions = await canvasApiRequest(`/courses/${course.id}/assignments/${assignment.id}/submissions`, {
                    student_id: 'self',
                  });
                  submission = Array.isArray(submissions) ? submissions[0] : submissions;
                } catch (e) {
                  // Submission check failed
                }

                if (!submission || submission.workflow_state !== 'submitted') {
                  overdueAssignments.push({
                    id: assignment.id,
                    name: assignment.name,
                    course_id: course.id,
                    course_name: course.name,
                    course_code: course.course_code,
                    due_at: assignment.due_at,
                    points_possible: assignment.points_possible,
                    days_overdue: Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
                  });
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error getting assignments for course ${course.id}:`, e);
        }
      }

      // Sort by days overdue (most overdue first)
      overdueAssignments.sort((a, b) => b.days_overdue - a.days_overdue);

      return {
        success: true,
        data: {
          assignments: overdueAssignments,
          total: overdueAssignments.length,
        },
      };
    },
  },

  get_upcoming_events: {
    name: 'get_upcoming_events',
    description: 'Get upcoming calendar events',
    category: 'Calendar & Scheduling',
    handler: async (args: Record<string, any> = {}) => {
      const daysAhead = args.days_ahead || 7;
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + daysAhead);

      const events = await getAllPaginatedData('/calendar_events', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        type: 'event',
      });

      return {
        success: true,
        data: {
          events: events.map((e: any) => ({
            id: e.id,
            title: e.title,
            start_at: e.start_at,
            end_at: e.end_at,
            location_name: e.location_name,
            context_code: e.context_code,
            description: e.description,
          })),
          total: events.length,
          days_ahead: daysAhead,
        },
      };
    },
  },
};

// List available tools
function listCanvasTools() {
  return {
    success: true,
    data: {
      total_tools: Object.keys(canvasTools).length,
      tools: Object.fromEntries(
        Object.entries(canvasTools).map(([key, tool]) => [
          key,
          {
            name: tool.name,
            description: tool.description,
            category: tool.category,
          },
        ])
      ),
    },
  };
}

// Call a Canvas tool
async function callCanvasTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
  const tool = (canvasTools as any)[toolName];
  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await tool.handler(args);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Tool execution failed',
    };
  }
}

const defaultCorsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

type EnvVars = {
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
  OLLAMA_BASIC_AUTH_USER?: string;
  OLLAMA_BASIC_AUTH_PASS?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var processEnv: EnvVars;
}

globalThis.processEnv = {
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
  OLLAMA_MODEL: process.env.OLLAMA_MODEL,
  OLLAMA_BASIC_AUTH_USER: process.env.OLLAMA_BASIC_AUTH_USER,
  OLLAMA_BASIC_AUTH_PASS: process.env.OLLAMA_BASIC_AUTH_PASS,
};

const PORT = Number(process.env.PORT || 8787);

const server = createServer(async (req, res) => {
  if (!req.url) {
    res.statusCode = 400;
    res.end('Missing URL');
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Global CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    res.statusCode = 200;
    Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, model: process.env.OLLAMA_MODEL || 'mistral' }));
    return;
  }

  // Route to appropriate handler
  let handler;
  if (url.pathname === '/api/chat') {
    handler = chatHandler;
  } else if (url.pathname === '/api/generate-practice') {
    handler = practiceHandler;
  } else if (url.pathname === '/api/chain-reasoning') {
    handler = chainReasoningHandler;
  } else if (url.pathname === '/api/compare-models') {
    handler = compareModelsHandler;
  } else if (url.pathname === '/api/log-preference') {
    handler = logPreferenceHandler;
  } else if (url.pathname === '/api/feedback') {
    handler = feedbackHandler;
  } else if (url.pathname.startsWith('/api/auth/')) {
    handler = localAuthHandler;
  } else if (url.pathname === '/api/canvas/connect' && req.method === 'POST') {
    const chunks: Uint8Array[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body.apiUrl || !body.apiKey) {
          res.statusCode = 400;
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'apiUrl and apiKey are required' }));
          return;
        }

        // Validate API key first
        const testUrl = new URL(`${body.apiUrl}/api/v1/users/self`);
        const testResponse = await fetch(testUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${body.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text().catch(() => 'Unknown error');
          res.statusCode = 200; // Return 200 but with success: false
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: false, 
            error: `API key is invalid: ${testResponse.status} - ${errorText}` 
          }));
          return;
        }

        // API key is valid, store connection
        canvasConn = { apiUrl: body.apiUrl, apiKey: body.apiKey };
        
        // Return tools list
        const toolsList = listCanvasTools();
        res.statusCode = 200;
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(toolsList));
      } catch (e: any) {
        res.statusCode = 500;
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: e?.message || 'connect failed' }));
      }
    });
    return;
  } else if (url.pathname === '/api/canvas/status' && req.method === 'GET') {
    // Check if Canvas is connected
    res.statusCode = 200;
    Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ 
      success: true, 
      connected: canvasConn !== null,
      hasApiKey: !!canvasConn?.apiKey 
    }));
    return;
  } else if (url.pathname === '/api/canvas/tools' && req.method === 'GET') {
    // Always return the tool list, even if not connected
    const toolsList = listCanvasTools();
    res.statusCode = 200;
    Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(toolsList));
    return;
  } else if (url.pathname === '/api/canvas/validate' && req.method === 'POST') {
    // Validate API key by making a test API call
    const chunks: Uint8Array[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!body.apiUrl || !body.apiKey) {
          res.statusCode = 400;
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'apiUrl and apiKey are required' }));
          return;
        }

        // Test the API key by making a simple request to get user info
        const testUrl = new URL(`${body.apiUrl}/api/v1/users/self`);
        const testResponse = await fetch(testUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${body.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!testResponse.ok) {
          const errorText = await testResponse.text().catch(() => 'Unknown error');
          res.statusCode = 200; // Return 200 but with success: false
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            success: false, 
            error: `API key is invalid: ${testResponse.status} - ${errorText}` 
          }));
          return;
        }

        // API key is valid
        res.statusCode = 200;
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: 'API key is valid' }));
      } catch (e: any) {
        res.statusCode = 200; // Return 200 but with success: false
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: e?.message || 'Validation failed' }));
      }
    });
    return;
  } else if (url.pathname === '/api/canvas/tools.call' && req.method === 'POST') {
    const chunks: Uint8Array[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        const toolName = body.toolName;
        const args = body.args || {};
        if (!toolName) {
          res.statusCode = 400;
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'toolName is required' }));
          return;
        }
        if (!canvasConn) {
          res.statusCode = 401;
          Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'Canvas not connected' }));
          return;
        }
        const result = await callCanvasTool(toolName, args);
        res.statusCode = result.success ? 200 : 500;
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (e: any) {
        res.statusCode = 500;
        Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: e?.message || 'tool call failed' }));
      }
    });
    return;
  } else {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const chunks: Uint8Array[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    const body = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : undefined;

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as any,
      body: body || undefined,
    });

    try {
      const response = await handler(request);
      res.statusCode = response.status;
      // Always include default CORS headers
      Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      if (response.body) {
        const reader = response.body.getReader();
        const stream = new ReadableStream({
          async pull(controller) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              return;
            }
            controller.enqueue(value);
          },
        });
        const streamReader = stream.getReader();
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error('Local API error:', error);
      res.statusCode = 500;
      Object.entries(defaultCorsHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal error', details: error?.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Local API proxy listening at http://localhost:${PORT}`);
  console.log(`Using Ollama endpoint: ${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}`);
  console.log(`Model: ${process.env.OLLAMA_MODEL || 'mistral'}`);
});
