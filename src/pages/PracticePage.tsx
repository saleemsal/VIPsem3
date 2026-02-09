import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { PracticeGenerator } from "@/components/Practice/PracticeGenerator";
import { useSources } from "@/hooks/useSources";

export default function PracticePage() {
  // PracticeGenerator now gets sources from registry directly


  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-gt-gold">Practice Generator</h1>
          <p className="text-muted-foreground">
            Generate practice questions that mirror existing quiz/exam formats
          </p>
        </div>

        <PracticeGenerator />
      </div>
    </div>
  );
}