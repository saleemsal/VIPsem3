import { Navbar } from '@/components/Navbar';
import { ChainReasoningInterface } from '@/components/ChainReasoning/ChainReasoningInterface';

export default function ChainReasoningPage() {
  return (
    <div className="min-h-screen bg-gradient-academic">
      <Navbar />
      <div className="container mx-auto px-6 py-8">
        <ChainReasoningInterface />
      </div>
    </div>
  );
}
