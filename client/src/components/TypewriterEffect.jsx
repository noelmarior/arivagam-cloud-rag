import React, { useState, useEffect, useRef } from 'react';

// Parses <u>...</u> and normal text to calculate visible length and render correctly
const getVisibleTokens = (content) => {
    const tokens = [];
    const regex = /(<u>|<\/u>)/g;
    let lastIndex = 0;
    let match;
    let isUnderline = false;

    while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ text: content.substring(lastIndex, match.index), isUnderline });
        }
        if (match[0] === '<u>') isUnderline = true;
        else if (match[0] === '</u>') isUnderline = false;
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
        tokens.push({ text: content.substring(lastIndex), isUnderline });
    }
    return tokens;
};

const TypewriterEffect = ({ content, onComplete, isStopped }) => {
    const [visibleChars, setVisibleChars] = useState(0);
    const [isTyping, setIsTyping] = useState(true);

    const tokens = getVisibleTokens(content);
    const totalChars = tokens.reduce((sum, t) => sum + t.text.length, 0);

    useEffect(() => {
        if (isStopped) {
            setIsTyping(false);
            // Calculate truncated original content
            let currentRemaining = visibleChars;
            let truncatedContent = '';
            let insideU = false;
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                if (currentRemaining <= 0) break;

                const take = Math.min(token.text.length, currentRemaining);
                const chunk = token.text.substring(0, take);

                if (token.isUnderline && !insideU) {
                    truncatedContent += '<u>';
                    insideU = true;
                } else if (!token.isUnderline && insideU) {
                    truncatedContent += '</u>';
                    insideU = false;
                }

                truncatedContent += chunk;
                currentRemaining -= take;
            }
            if (insideU) {
                truncatedContent += '</u>';
            }
            if (onComplete) onComplete(truncatedContent);
            return;
        }

        setVisibleChars(0);
        setIsTyping(true);

        const interval = setInterval(() => {
            setVisibleChars(prev => {
                const next = prev + 1;
                if (next >= totalChars) {
                    clearInterval(interval);
                    setIsTyping(false);
                    if (onComplete) onComplete(content);
                }
                return next;
            });
        }, 15);

        return () => clearInterval(interval);
    }, [content, isStopped, totalChars]);

    const renderElements = () => {
        let currentRemaining = visibleChars;
        const elements = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (currentRemaining <= 0) break;
            const take = Math.min(token.text.length, currentRemaining);
            const chunk = token.text.substring(0, take);

            // Re-use logic from renderContent in Chat.jsx for potential ** rendering inside
            const renderChunk = (text) => {
                return text.split(/(\*\*.*?\*\*)/g).map((part, idx) =>
                    part.startsWith('**') && part.endsWith('**')
                        ? <strong key={idx} className="font-bold text-blue-900 dark:text-[#8AB4F8]">{part.slice(2, -2)}</strong>
                        : part
                );
            };

            if (token.isUnderline) {
                elements.push(<span key={i} className="text-blue-900 dark:text-[#8AB4F8] font-bold">{renderChunk(chunk)}</span>);
            } else {
                elements.push(<span key={i}>{renderChunk(chunk)}</span>);
            }
            currentRemaining -= take;
        }
        return elements;
    };

    return (
        <div className="prose prose-sm leading-relaxed whitespace-pre-wrap max-w-none prose-strong:text-blue-900 dark:prose-strong:text-[#8AB4F8]">
            {renderElements()}
            {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-gray-400 animate-pulse align-middle"></span>}
        </div>
    );
};

export default TypewriterEffect;
