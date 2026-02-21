import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

const TypewriterEffect = ({ content, onComplete, isStopped }) => {
    const [displayedContent, setDisplayedContent] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const indexRef = useRef(0);

    useEffect(() => {
        if (isStopped) {
            setIsTyping(false);
            if (onComplete) onComplete(displayedContent);
            return;
        }

        indexRef.current = 0;
        setDisplayedContent('');
        setIsTyping(true);

        const interval = setInterval(() => {
            if (indexRef.current < content.length) {
                const charToAdd = content.charAt(indexRef.current);
                setDisplayedContent((prev) => prev + charToAdd);
                indexRef.current++;
            } else {
                clearInterval(interval);
                setIsTyping(false);
                if (onComplete) onComplete(content);
            }
        }, 15); // Fast typing speed

        return () => clearInterval(interval);
    }, [content, isStopped]);

    return (
        <div className="prose prose-sm leading-relaxed whitespace-pre-wrap max-w-none">
            {/* Render markdown as it comes in */}
            <ReactMarkdown>{displayedContent}</ReactMarkdown>
            {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 animate-pulse align-middle"></span>}
        </div>
    );
};

export default TypewriterEffect;
