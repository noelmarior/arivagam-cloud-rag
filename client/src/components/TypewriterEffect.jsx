import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const TypewriterEffect = ({ content, onComplete }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const indexRef = useRef(0);

    useEffect(() => {
        indexRef.current = 0;
        setDisplayedContent('');
        setIsTyping(true);

        const interval = setInterval(() => {
            if (indexRef.current < content.length) {
                setDisplayedContent((prev) => prev + content.charAt(indexRef.current));
                indexRef.current++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                if (onComplete) onComplete();
            }
        }, 15); // Fast typing speed

        return () => clearInterval(interval);
    }, [content]);

    return (
        <div className="prose prose-sm leading-relaxed whitespace-pre-wrap max-w-none">
            {/* Render markdown as it comes in */}
            <ReactMarkdown>{displayedContent}</ReactMarkdown>
            {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 animate-pulse align-middle"></span>}
        </div>
    );
};

export default TypewriterEffect;
