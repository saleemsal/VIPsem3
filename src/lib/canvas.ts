import { addDocs } from './rag';

export function connectCanvasMock() {
  // Mock Canvas documents - expanded for better demo
  const mockDocs = [
    {
      id: 'canvas1',
      source: 'Canvas:CS3510_Assignment1.pdf',
      page: 1,
      text: 'Problem 1: Implement Dijkstra\'s algorithm for shortest path computation. Show time complexity analysis. The algorithm should handle both directed and undirected graphs with non-negative edge weights.'
    },
    {
      id: 'canvas2', 
      source: 'Canvas:CS3510_Lecture5.pdf',
      page: 3,
      text: 'Graph algorithms overview: BFS, DFS, minimum spanning trees, and shortest path algorithms. Breadth-First Search explores nodes level by level, while Depth-First Search explores as far as possible along each branch before backtracking.'
    },
    {
      id: 'canvas3',
      source: 'Canvas:CS3510_Midterm_Study_Guide.pdf', 
      page: 1,
      text: 'Key topics for midterm: Dynamic programming, greedy algorithms, graph traversal, complexity analysis. Dynamic programming solves problems by breaking them down into overlapping subproblems and storing results.'
    },
    {
      id: 'canvas4',
      source: 'Canvas:CS3510_Lecture8.pdf',
      page: 2,
      text: 'Greedy algorithms make locally optimal choices at each step. Examples include Huffman coding, activity selection, and fractional knapsack problem.'
    },
    {
      id: 'canvas5',
      source: 'Canvas:CS3510_Assignment2.pdf',
      page: 1,
      text: 'Problem 2: Design a dynamic programming solution for the longest common subsequence problem. Analyze time and space complexity.'
    }
  ];
  
  addDocs(mockDocs);
  console.log(`Loaded ${mockDocs.length} Canvas documents into search index`);
  return mockDocs.length;
}

export function getMockAssignments() {
  return [
    { name: 'Assignment 1: Graph Algorithms', dueDate: '2024-02-15', course: 'CS3510' },
    { name: 'Midterm Exam', dueDate: '2024-02-22', course: 'CS3510' },
    { name: 'Project Proposal', dueDate: '2024-02-28', course: 'CS3510' }
  ];
}