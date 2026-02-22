import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
            setCurrentStep((prev) => {
                if (prev < steps.length - 1) {
                    return prev + 1;
                }
                clearInterval(interval);
                return prev;
            });
        }, 1000); // 1-second interval for each step

        return () => clearInterval(interval);
    }, [steps.length]);

    return (
        <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="fade-in transition-opacity duration-300 animate-pulse">
                {steps[currentStep]}
            </span>
        </div>
    );
};

export default ReasoningLoader;
