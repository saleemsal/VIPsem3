import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  BookOpen,
  Download,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";

interface Assignment {
  id: string;
  title: string;
  course: string;
  dueDate: Date;
  type: "assignment" | "quiz" | "exam" | "project";
  priority: "low" | "medium" | "high";
  completed: boolean;
  estimatedHours?: number;
  description?: string;
  canvasUrl?: string;
}

interface StudyBlock {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  course: string;
  type: "study" | "review" | "assignment";
  completed: boolean;
}

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [assignments, setAssignments] = useState<Assignment[]>([
    {
      id: "1",
      title: "Programming Assignment 3",
      course: "CS 1301",
      dueDate: new Date(2024, 0, 20),
      type: "assignment",
      priority: "high",
      completed: false,
      estimatedHours: 8,
      description: "Implement object-oriented design patterns",
      canvasUrl: "https://canvas.gatech.edu/courses/123/assignments/456"
    },
    {
      id: "2",
      title: "Data Structures Quiz 2",
      course: "CS 1332", 
      dueDate: new Date(2024, 0, 18),
      type: "quiz",
      priority: "medium",
      completed: true,
      estimatedHours: 2,
      description: "Trees and graphs"
    },
    {
      id: "3",
      title: "Calculus Midterm",
      course: "MATH 1552",
      dueDate: new Date(2024, 0, 25),
      type: "exam",
      priority: "high",
      completed: false,
      estimatedHours: 12,
      description: "Chapters 1-6, integration techniques"
    },
    {
      id: "4",
      title: "Lab Report 2",
      course: "PHYS 2211",
      dueDate: new Date(2024, 0, 22),
      type: "assignment",
      priority: "medium",
      completed: false,
      estimatedHours: 4,
      description: "Oscillations and waves"
    }
  ]);

  const [studyBlocks, setStudyBlocks] = useState<StudyBlock[]>([
    {
      id: "sb1",
      title: "CS 1301 Review",
      date: new Date(2024, 0, 16),
      startTime: "14:00",
      endTime: "16:00",
      course: "CS 1301",
      type: "study",
      completed: false
    },
    {
      id: "sb2",
      title: "Math Problem Set",
      date: new Date(2024, 0, 17),
      startTime: "10:00", 
      endTime: "12:00",
      course: "MATH 1552",
      type: "assignment",
      completed: true
    }
  ]);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAssignmentsForDate = (date: Date) => {
    return assignments.filter(assignment => isSameDay(assignment.dueDate, date));
  };

  const getStudyBlocksForDate = (date: Date) => {
    return studyBlocks.filter(block => isSameDay(block.date, date));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-500 border-red-500/30 bg-red-500/10";
      case "medium": return "text-yellow-500 border-yellow-500/30 bg-yellow-500/10";
      case "low": return "text-green-500 border-green-500/30 bg-green-500/10";
      default: return "text-gray-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "assignment": return <BookOpen className="h-3 w-3" />;
      case "quiz": return <CheckCircle2 className="h-3 w-3" />;
      case "exam": return <AlertCircle className="h-3 w-3" />;
      case "project": return <BookOpen className="h-3 w-3" />;
      default: return <BookOpen className="h-3 w-3" />;
    }
  };

  const handleToggleComplete = (id: string, type: "assignment" | "study") => {
    if (type === "assignment") {
      setAssignments(prev => prev.map(assignment => 
        assignment.id === id 
          ? { ...assignment, completed: !assignment.completed }
          : assignment
      ));
    } else {
      setStudyBlocks(prev => prev.map(block => 
        block.id === id 
          ? { ...block, completed: !block.completed }
          : block
      ));
    }
  };

  const handleSyncCanvas = () => {
    // Mock Canvas sync
    console.log("Syncing with Canvas...");
  };

  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gt-gold">Study Planner</h1>
            <p className="text-muted-foreground">
              Weekly study plan from Canvas assignments and due dates
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSyncCanvas}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Canvas
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export ICS
            </Button>
            <Button variant="gt-gold">
              <Plus className="mr-2 h-4 w-4" />
              Add Study Block
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Calendar Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 mb-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md"
              />
            </Card>

            {/* Upcoming Assignments */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Upcoming Assignments</h3>
              <div className="space-y-3">
                {assignments
                  .filter(a => !a.completed && a.dueDate >= new Date())
                  .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
                  .slice(0, 5)
                  .map((assignment) => (
                    <div key={assignment.id} className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{assignment.title}</h4>
                          <p className="text-xs text-muted-foreground">{assignment.course}</p>
                        </div>
                        <Badge variant="outline" className={`${getPriorityColor(assignment.priority)} text-xs`}>
                          {assignment.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Due {format(assignment.dueDate, "MMM d")}
                        {assignment.estimatedHours && (
                          <span>• {assignment.estimatedHours}h</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>

          {/* Main Calendar View */}
          <div className="lg:col-span-3">
            {viewMode === "week" && (
              <div className="space-y-6">
                {/* Week Header */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                      Week of {format(weekStart, "MMMM d")} - {format(weekEnd, "d, yyyy")}
                    </h2>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                      >
                        Previous Week
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                      >
                        Next Week
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Week Grid */}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {weekDays.map((day) => {
                    const dayAssignments = getAssignmentsForDate(day);
                    const dayStudyBlocks = getStudyBlocksForDate(day);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <Card 
                        key={day.toISOString()} 
                        className={`p-4 min-h-[200px] ${
                          isToday ? "ring-2 ring-primary/50 bg-primary/5" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Day Header */}
                          <div className="text-center">
                            <h3 className="font-medium">{format(day, "EEE")}</h3>
                            <p className={`text-sm ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                              {format(day, "d")}
                            </p>
                          </div>

                          {/* Assignments */}
                          {dayAssignments.map((assignment) => (
                            <div 
                              key={assignment.id}
                              className={`p-2 rounded-md text-xs space-y-1 ${getPriorityColor(assignment.priority)}`}
                            >
                              <div className="flex items-center gap-1">
                                {getTypeIcon(assignment.type)}
                                <span className="font-medium truncate">{assignment.title}</span>
                              </div>
                              <p className="text-xs opacity-80">{assignment.course}</p>
                              <div className="flex items-center justify-between">
                                <span>Due</span>
                                <button
                                  onClick={() => handleToggleComplete(assignment.id, "assignment")}
                                  className={assignment.completed ? "line-through opacity-60" : ""}
                                >
                                  <CheckCircle2 className={`h-3 w-3 ${assignment.completed ? "text-green-500" : ""}`} />
                                </button>
                              </div>
                              {assignment.canvasUrl && (
                                <a 
                                  href={assignment.canvasUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                                >
                                  <LinkIcon className="h-3 w-3" />
                                  Canvas
                                </a>
                              )}
                            </div>
                          ))}

                          {/* Study Blocks */}
                          {dayStudyBlocks.map((block) => (
                            <div 
                              key={block.id}
                              className="p-2 rounded-md text-xs space-y-1 bg-blue-500/10 border border-blue-500/30"
                            >
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                <span className="font-medium truncate">{block.title}</span>
                              </div>
                              <p className="text-xs opacity-80">{block.course}</p>
                              <div className="flex items-center justify-between">
                                <span>{block.startTime} - {block.endTime}</span>
                                <button
                                  onClick={() => handleToggleComplete(block.id, "study")}
                                  className={block.completed ? "line-through opacity-60" : ""}
                                >
                                  <CheckCircle2 className={`h-3 w-3 ${block.completed ? "text-green-500" : ""}`} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Week Summary */}
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Week Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary">
                        {assignments.filter(a => 
                          a.dueDate >= weekStart && 
                          a.dueDate <= weekEnd && 
                          !a.completed
                        ).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Assignments Due</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">
                        {studyBlocks.filter(b => 
                          b.date >= weekStart && 
                          b.date <= weekEnd
                        ).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Study Sessions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">
                        {assignments.filter(a => 
                          a.dueDate >= weekStart && 
                          a.dueDate <= weekEnd && 
                          a.estimatedHours
                        ).reduce((total, a) => total + (a.estimatedHours || 0), 0)}h
                      </p>
                      <p className="text-sm text-muted-foreground">Study Hours</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}