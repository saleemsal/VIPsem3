import { getMockAssignments } from './canvas';

export function generateWeeklyPlan() {
  const assignments = getMockAssignments();
  const today = new Date();
  const days = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayTasks = assignments
      .filter(a => new Date(a.dueDate) <= date)
      .map(a => ({
        type: 'assignment' as const,
        title: a.name,
        course: a.course,
        priority: new Date(a.dueDate).getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000 ? 'high' : 'medium'
      }));
    
    // Add study sessions
    if (i % 2 === 0) {
      dayTasks.push({
        type: 'assignment' as const,
        title: 'Review uploaded materials',
        course: 'General',
        priority: 'low' as const
      });
    }
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      tasks: dayTasks
    });
  }
  
  return days;
}