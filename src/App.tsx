import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import ChatPage from "./pages/ChatPage";
import SearchPage from "./pages/SearchPage";
import PracticePage from "./pages/PracticePage";
import FlashcardsPage from "./pages/FlashcardsPage";
import PlannerPage from "./pages/PlannerPage";
import SettingsPage from "./pages/SettingsPage";
import ChainReasoningPage from "./pages/ChainReasoningPage";
import NotFound from "./pages/NotFound";
import { sourcesRegistry } from "./lib/sources";
import { connectCanvasMock } from "./lib/canvas";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Load demo data and Canvas mock on app startup
    const initializeData = async () => {
      try {
        await sourcesRegistry.initialize();
        connectCanvasMock();
        console.log('Demo data and Canvas mock loaded successfully');
      } catch (error) {
        console.error('Error loading demo data:', error);
      }
    };

    initializeData();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthGate>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<ChatPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/flashcards" element={<FlashcardsPage />} />
                <Route path="/planner" element={<PlannerPage />} />
                <Route path="/reasoning" element={<ChainReasoningPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AuthGate>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
