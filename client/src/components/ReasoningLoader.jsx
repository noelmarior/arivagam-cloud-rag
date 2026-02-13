import React, { useState, useEffect } from 'react';
import { Sparkles, Brain } from 'lucide-react';

const ReasoningLoader = () => {
    const steps = [
        "Reading your files...",
        "Connecting concepts...",
        "Drafting response...",
        "Polishing..."
    ];

    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % steps.length);
        }, 800); // Cycle every 800ms
        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <div className="flex items-center gap-2 text-gray-500 text-sm animate-pulse font-medium">
            <Brain className="w-4 h-4 text-blue-500 animate-bounce" />
            <span className="fade-in transition-opacity duration-300">
                {steps[currentStep]}
            </span>
        </div>
    );
};

export default ReasoningLoader;
