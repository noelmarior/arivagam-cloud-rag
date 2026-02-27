import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Files, Crosshair, EyeOff } from 'lucide-react';
import logo from '../assets/logo_mel.png';

const MockupVisual = () => {
    const [step, setStep] = useState(0);
    const [typedUserText, setTypedUserText] = useState("");
    const [typedAIText, setTypedAIText] = useState("");

    const userTextToType = "What are the core capabilities of autonomous action models?";
    const aiTextToType = "An autonomous action model refers to AI systems, agents, or frameworks designed to independently perceive their environment, reason, plan, and execute actions to achieve specific, high-level goals with minimal or no human intervention.";

    // Revised animation states: 
    // 0: Empty
    // 1: PDF uploaded (wait a tiny bit before chat opens)
    // 2: Chat opened & User starts typing ("AI/ML..." title appears)
    // 3: User finished typing, holds for a fraction of a second
    // 4: Message sent, AI starts thinking
    // 5: AI starts typing response
    // 6: AI finished typing, holds so user can read it
    const states = [
        { id: 0, duration: 1500 }, // Empty state
        { id: 1, duration: 600 },  // PDF uploaded, wait briefly
        { id: 2, duration: 1800 }, // User Typing (takes ~1.8s)
        { id: 3, duration: 400 },  // Slight pause after typing
        { id: 4, duration: 2000 }, // Message sent, AI thinking (loader)
        { id: 5, duration: 2500 }, // AI typing its response (takes ~2.5s)
        { id: 6, duration: 4000 }  // Hold reading
    ];

    useEffect(() => {
        let currentIdx = 0;
        let timeout;

        const advance = () => {
            currentIdx = (currentIdx + 1) % states.length;
            setStep(states[currentIdx].id);
            timeout = setTimeout(advance, states[currentIdx].duration);
        };

        timeout = setTimeout(advance, states[0].duration);
        return () => clearTimeout(timeout);
    }, []);

    // Effect for typing the User question
    useEffect(() => {
        if (step === 2) {
            let i = 0;
            setTypedUserText("");
            const typingInterval = setInterval(() => {
                if (i <= userTextToType.length) {
                    setTypedUserText(userTextToType.substring(0, i));
                    i++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 1800 / userTextToType.length);
            return () => clearInterval(typingInterval);
        } else if (step < 2) {
            setTypedUserText("");
        }
    }, [step]);

    // Effect for typing the AI response
    useEffect(() => {
        if (step === 5) {
            let i = 0;
            setTypedAIText("");
            const typingInterval = setInterval(() => {
                if (i <= aiTextToType.length) {
                    setTypedAIText(aiTextToType.substring(0, i));
                    i++;
                } else {
                    clearInterval(typingInterval);
                }
            }, 2500 / aiTextToType.length);
            return () => clearInterval(typingInterval);
        } else if (step < 5) {
            setTypedAIText("");
        }
    }, [step]);

    return (
        <div className="mt-20 w-full max-w-5xl h-[520px] sm:h-[480px] border border-border bg-bg flex flex-col sm:flex-row shadow-xl shadow-slate-200/50 rounded-lg overflow-hidden relative">
            {/* Left Panel: Sources */}
            <div className="flex-[0.35] sm:min-w-[280px] border-b sm:border-b-0 sm:border-r border-border flex flex-col bg-[#F8FAFC]">
                <div className="h-14 border-b border-border flex items-center px-4 bg-bg">
                    <Files className="w-4 h-4 text-slate-500 mr-2" />
                    <span className="font-heading text-[13px] font-bold text-primary tracking-wide uppercase">Sources</span>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-3 relative overflow-hidden">
                    {step >= 1 ? (
                        <div className="animate-fade-in flex items-center gap-3 p-3 border border-border rounded-lg bg-bg shadow-sm transition-all">
                            <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-red-50 rounded border border-red-100/50">
                                <span className="font-mono text-xs font-bold text-red-500 flex flex-col items-center">
                                    <svg className="w-4 h-4 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </span>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-primary truncate">AI_ZeroToPro.pdf</span>
                                <span className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                    My Drive (Root)
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-6 text-center animate-fade-in">
                            <div className="border border-dashed border-border w-full py-8 flex flex-col items-center justify-center rounded-lg bg-surface/50">
                                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">Workspace Empty</span>
                                <span className="text-[10px] text-slate-400">Upload to initialize knowledge</span>
                            </div>
                        </div>
                    )}

                    <div className={`mt-2 border border-dashed border-blue-200 text-blue-500 rounded-lg py-2.5 flex items-center justify-center gap-2 transition-all ${step >= 1 ? 'animate-fade-in opacity-100' : 'opacity-0 translate-y-2'}`}>
                        <span className="text-lg leading-none mb-0.5 font-light">+</span>
                        <span className="text-[13px] font-medium tracking-wide">Add Source</span>
                    </div>
                </div>
            </div>

            {/* Right Panel: Chat */}
            <div className="flex-[0.65] flex flex-col bg-bg relative">
                {/* Header - Only appears when step >= 2 (after PDF uploaded) */}
                <div className={`h-14 border-b border-border flex items-center justify-between px-6 bg-bg/90 backdrop-blur-sm z-10 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <span className="font-heading font-bold text-primary text-sm flex items-center gap-2">
                        AI/ML: Foundations & Future Frontiers
                    </span>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                </div>

                {/* Messages Area */}
                <div className="flex-1 p-6 flex flex-col gap-6 overflow-hidden justify-end">
                    {step >= 4 && (
                        <div className="animate-fade-in self-end max-w-[85%]">
                            <div className="bg-surface border border-border px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
                                <p className="text-[14px] text-slate-800 leading-relaxed font-sans">
                                    {userTextToType}
                                </p>
                            </div>
                        </div>
                    )}

                    {step >= 4 && (
                        <div className="animate-fade-in self-start max-w-[95%] flex gap-3">
                            <div className="w-8 h-8 flex-shrink-0 bg-[#0F172A] rounded-full flex items-center justify-center mt-0.5 shadow-sm overflow-hidden border-2 border-transparent">
                                <img src={logo} className="w-5 h-5 object-contain" alt="AI" />
                            </div>
                            <div className="flex-1 bg-bg border border-border p-4.5 rounded-2xl rounded-tl-sm shadow-sm relative">
                                {step === 4 ? (
                                    <div className="space-y-3 p-1">
                                        <div className="h-2.5 bg-slate-200/80 rounded w-full animate-pulse"></div>
                                        <div className="h-2.5 bg-slate-200/80 rounded w-[85%] animate-pulse"></div>
                                        <div className="h-2.5 bg-slate-200/80 rounded w-2/3 animate-pulse"></div>
                                    </div>
                                ) : (
                                    <div className="text-[14px] text-slate-700 leading-[1.6] animate-fade-in font-sans text-left">
                                        <span className="whitespace-pre-wrap">{step === 5 ? typedAIText : aiTextToType}</span>
                                        {step === 5 && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-slate-400 animate-pulse align-middle"></span>}

                                        {step >= 6 && (
                                            <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2 animate-fade-in">
                                                <span className="text-[11px] font-mono border border-slate-200 text-blue-600 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm bg-white">
                                                    [1] AI_ZeroToPro.pdf
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className={`p-4 bg-bg border-t border-border relative z-10 transition-opacity duration-300 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex gap-2.5 max-w-4xl mx-auto items-center">
                        <div className="flex-1 border border-border shadow-sm rounded-xl bg-white px-4 flex items-center h-[52px] overflow-hidden relative">
                            {step === 2 || step === 3 ? (
                                <div className="text-[14px] text-slate-800 font-sans tracking-tight w-full flex items-center">
                                    <span>{step === 2 ? typedUserText : userTextToType}</span>
                                    <span className="w-0.5 h-4 ml-0.5 bg-primary animate-pulse"></span>
                                </div>
                            ) : step >= 4 ? (
                                <span className="text-[14px] text-slate-400 font-sans tracking-tight opacity-50">Ask a question...</span>
                            ) : (
                                <span className="text-[14px] text-slate-400 font-sans tracking-tight">Ask a question...</span>
                            )}
                        </div>
                        <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center transition-all ${step === 2 || step === 3 ? 'bg-primary text-white shadow-md' : 'bg-surface border border-border text-slate-400'}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={step === 2 || step === 3 ? 'transform translate-y-0.5 transition-transform' : ''}><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Landing = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-bg font-sans text-primary selection:bg-blue-100 flex flex-col">
            {/* Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-bg border-b border-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                        <img src="/logo_mel.png" alt="ARIVAGAM Logo" className="w-8 h-8 object-contain" />
                        <span className="font-heading uppercase tracking-wide font-bold text-2xl">ARIVAGAM</span>
                    </div>

                    {/* Right CTA */}
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-sm font-medium hover:text-accent transition-colors px-4 py-2 bg-transparent text-primary">
                            Login
                        </Link>
                        <Link to="/register" className="text-sm font-medium bg-primary text-bg transition-all px-5 py-2.5 rounded-none hover:bg-black">
                            Start
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow flex flex-col mt-12 md:mt-20">
                {/* Hero Section */}
                <section className="flex flex-col items-center justify-center pt-12 pb-16 px-4 text-center max-w-5xl mx-auto w-full">
                    <h1 className="font-heading font-bold text-5xl md:text-6xl lg:text-7xl tracking-tight leading-tight text-primary mb-6">
                        Stop the Tab Dance.
                    </h1>
                    <p className="text-lg md:text-xl text-slate-600 max-w-2xl mb-10">
                        Your Resource and AI, Finally in One Place.
                    </p>
                    <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 bg-accent text-white font-mono text-sm uppercase tracking-wider hover:bg-blue-600 transition-colors">
                        Create Workspace
                    </Link>

                    {/* CSS Animated Mockup Visual */}
                    <MockupVisual />
                </section>

                {/* Features Section */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 mb-24 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
                    {/* Feature 1 */}
                    <div className="p-8 lg:p-10 flex flex-col h-full bg-bg border border-border shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer relative">
                        <Files className="w-8 h-8 mb-6 text-primary" strokeWidth={1.5} />
                        <h3 className="font-heading font-semibold text-xl mb-3">Cross-Doc Synthesis</h3>
                        <p className="text-slate-600 mb-6 flex-grow">PDF, DOCX, XLSX entangled. Query across all your uploads instantly.</p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                            <span className="text-xs font-mono px-2 py-1 border border-border text-slate-500 bg-surface">.pdf</span>
                            <span className="text-xs font-mono px-2 py-1 border border-border text-slate-500 bg-surface">.docx</span>
                            <span className="text-xs font-mono px-2 py-1 border border-border text-slate-500 bg-surface">.xlsx</span>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="p-8 lg:p-10 flex flex-col h-full bg-bg border border-border shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer relative">
                        <Crosshair className="w-8 h-8 mb-6 text-primary" strokeWidth={1.5} />
                        <h3 className="font-heading font-semibold text-xl mb-3">Pinpoint Accuracy</h3>
                        <p className="text-slate-600 flex-grow">Zero hallucinations. Every claim is cited directly from your uploaded materials.</p>
                    </div>

                    {/* Feature 3 */}
                    <div className="p-8 lg:p-10 flex flex-col h-full bg-bg border border-border shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer relative">
                        <EyeOff className="w-8 h-8 mb-6 text-primary" strokeWidth={1.5} />
                        <h3 className="font-heading font-semibold text-xl mb-3">Academic Focus</h3>
                        <p className="text-slate-600 flex-grow">No notification bells. Just raw data, structured perfectly for deep work.</p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border bg-bg w-full">
                <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border text-sm max-w-7xl mx-auto border-x-0 lg:border-x">
                    <div className="p-6 md:p-8 flex flex-col gap-2">
                        <span className="font-heading font-bold text-primary mb-2 tracking-wide">ARIVAGAM</span>
                        <span className="text-slate-500 text-sm">Structured Knowledge OS.</span>
                        <span className="font-mono text-xs text-slate-400 mt-4">&copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col gap-3">
                        <span className="font-mono text-xs uppercase text-slate-400 mb-2 tracking-wider">Product</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Features</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Security</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Changelog</span>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col gap-3">
                        <span className="font-mono text-xs uppercase text-slate-400 mb-2 tracking-wider">Resources</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Documentation</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Blog</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Support</span>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col gap-3">
                        <span className="font-mono text-xs uppercase text-slate-400 mb-2 tracking-wider">Legal</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Privacy</span>
                        <span className="text-slate-600 hover:text-accent transition-colors cursor-pointer">Terms of Service</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
