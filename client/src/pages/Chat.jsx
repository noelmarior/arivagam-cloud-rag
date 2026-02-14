import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams, useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import {
  MessageSquare, Plus, Send, MoreVertical, FileText, Check, Loader2, Folder, SendHorizontal, PenLine
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import SourceSelector from '../components/SourceSelector';
import StyleManager from '../components/StyleManager';
import { useNotepad } from '../context/NotepadContext';

import ReasoningLoader from '../components/ReasoningLoader';
import TypewriterEffect from '../components/TypewriterEffect';
import logo from '../assets/logo.png';
import { getFileTheme } from '../utils/themeHelper';

const Chat = () => {
  const { addNote } = useNotepad();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSessions, setActiveSessionId } = useOutletContext() || {};

  // State
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);

  // ✅ 2. NEW STATE FOR STYLE
  const [activeStyle, setActiveStyle] = useState(null);

  // Exam Controls
  const messagesEndRef = useRef(null);
  const hasInitialized = useRef(false);

  // Init / Load session
  useEffect(() => {
    if (setActiveSessionId) setActiveSessionId(sessionId); // UPDATE GLOBAL STATE

    if (location.state?.contextFiles && !sessionId) {
      if (hasInitialized.current) return;
      hasInitialized.current = true;
      initializeNewSession(location.state.contextFiles);
    } else if (sessionId) {
      loadSessionDetails(sessionId);
    }

    // Cleanup on unmount (Optional, but good practice to clear if leaving chat)
    return () => {
      if (setActiveSessionId) setActiveSessionId(null);
    };
  }, [sessionId, location.state]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setInput("");
  }, [sessionId]);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const initializeNewSession = async (fileIds) => {
    setAnalyzing(true);
    try {
      const res = await api.post('/sessions/init', { fileIds });
      navigate(`/chat/${res.data._id}`, { replace: true, state: {} });
    } catch (err) {
      console.error("Session Init Error:", err);
      toast.error("Failed to initialize session");
      navigate('/dashboard');
    } finally {
      setAnalyzing(false);
      hasInitialized.current = false;
    }
  };

  const loadSessionDetails = async (id) => {
    setLoadingSession(true);
    try {
      const res = await api.get(`/sessions/${id}`);
      setCurrentSession(res.data);

      if (res.data.messages && res.data.messages.length > 0) {
        setMessages(res.data.messages);
      } else {
        setMessages([{
          role: 'assistant',
          content: `${res.data.aiSummary || "Session ready."}\n\n**How can I help you with this?**`
        }]);
      }
    } catch (err) {
      console.error("Load Session Error:", err);
      toast.error("Could not load session");
    } finally {
      setLoadingSession(false);
    }
  };
  // ✅ 3. UPDATED HANDLE SEND
  const handleSend = async (e) => {
    if (e) e.preventDefault(); // Handle form submission
    if (!input.trim() || !currentSession) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    const tempId = Date.now();
    setMessages(prev => [...prev, { role: 'assistant', content: "...", isTemp: true, _id: tempId }]);

    try {
      const res = await api.post('/chat/message', {
        sessionId: currentSession._id,
        message: userMsg.content,
        // Pass the custom style instruction if active, otherwise backend uses default
        styleInstruction: activeStyle ? activeStyle.instruction : null
      });

      setMessages(prev =>
        prev.map(msg => msg._id === tempId ? { ...res.data, role: 'assistant', shouldAnimate: true } : msg)
      );

      // Refresh sidebar list to update recency
      if (refreshSessions) refreshSessions();

    } catch (err) {
      console.error("Message Send Error:", err);
      setMessages(prev => prev.filter(msg => msg._id !== tempId));
      toast.error("Failed to get response");
    }
  };

  // ... (handlers)

  const handleAddSources = async (fileIds) => {
    setIsAddSourceOpen(false);
    const toastId = toast.loading("Updating Context...");
    try {
      const res = await api.post(
        `/sessions/${currentSession._id}/sources`,
        { fileIds }
      );

      setCurrentSession(res.data);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**System Update:** Added ${fileIds.length} new source(s) to the context.`
      }]);

      toast.dismiss(toastId);
    } catch {
      toast.error("Failed to add sources", { id: toastId });
    }
  };

  const renderContent = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={index} className="font-bold text-blue-900">{part.slice(2, -2)}</strong>
        : part
    );
  };

  const handleContextMenu = (e) => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText && selection.anchorNode.parentElement.closest('.prose')) {
      e.preventDefault(); // Stop default browser menu

      // Calculate position relative to the viewport
      const x = e.clientX;
      const y = e.clientY;

      // Determine source for citation
      let source = "AI Chat Response";
      // (Optional: You can add logic here to parse citations like [Source 1, pg 40] if your AI generates them)

      setContextMenu({ x, y, text: selectedText, source });
    } else {
      setContextMenu(null);
    }
  };

  const handleAddToNotes = () => {
    if (contextMenu) {
      addNote(contextMenu.text, contextMenu.source);
      setContextMenu(null);
    }
  };

  if (analyzing) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Analyzing Sources...</h2>
        <p className="text-gray-500 mt-2">Generating study plan and summary</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">

      <SourceSelector
        isOpen={isAddSourceOpen}
        onClose={() => setIsAddSourceOpen(false)}
        onStart={handleAddSources}
        customLabel="Add to Context"
      />

      {/* --- LEFT PANEL: SOURCES --- */}
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Sources
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingSession ? (
            <div className="flex justify-center py-4">
              <Loader2 className="animate-spin w-5 h-5 text-gray-400" />
            </div>
          ) : (
            currentSession?.sourceFiles?.map((file, idx) => {
              const theme = getFileTheme(file.fileName);
              return (
                <div key={idx} className="flex flex-col p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 ${theme.light} rounded-md ${theme.text}`}>
                      <theme.Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 truncate">
                      {file.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-1">
                    <Folder className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400 truncate">
                      {file.folderId ? file.folderId.name : "My Drive (Root)"}
                    </span>
                  </div>
                </div>
              )
            })
          )}

          <button
            onClick={() => setIsAddSourceOpen(true)}
            className="flex items-center justify-center gap-2 w-full p-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition mt-2 border border-dashed border-blue-200 hover:border-blue-400"
          >
            <Plus className="w-4 h-4" /> Add Source
          </button>
        </div>
      </div>

      {/* --- RIGHT PANEL: CHAT --- */}
      <div className="flex-1 flex flex-col relative bg-white">
        <div className="h-16 border-b border-gray-100 flex items-center px-6 bg-white sticky top-0 z-10 shadow-sm">
          <h1 className="font-bold text-gray-800 text-lg">
            {currentSession ? currentSession.name : "Study Session"}
          </h1>
        </div>


        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 bg-gray-50/50">


          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <img
                  src={logo}
                  alt="AI"
                  className="w-8 h-8 rounded-full object-contain mr-3 mt-1 bg-white border border-gray-100 p-0.5"
                />
              )}

              {/* Message Bubble */}
              <div
                onContextMenu={(e) => msg.role === 'assistant' && handleContextMenu(e, msg)}
                className={`max-w-3xl p-5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                  ? 'bg-gray-900 text-white rounded-br-none prose prose-invert prose-sm'
                  : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-none prose prose-sm'
                  }`}
              >
                {msg.isTemp ? (
                  <ReasoningLoader />
                ) : (
                  // If it's the assistant and marked for animation (newly arrived), type it out.
                  // Otherwise, show static content.
                  msg.role === 'assistant' && msg.shouldAnimate ? (
                    <TypewriterEffect content={msg.content} />
                  ) : (
                    renderContent(msg.content)
                  )
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />

          {/* Context Menu Popup */}
          {contextMenu && (
            <div
              className="fixed z-[100] bg-white border border-gray-200 shadow-xl rounded-lg py-1 animate-in fade-in zoom-in-95 duration-100"
              style={{ top: contextMenu.y, left: contextMenu.x }}
            >
              <button
                onClick={handleAddToNotes}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition font-medium"
              >
                <PenLine className="w-4 h-4" /> Add to Notes
              </button>
            </div>
          )}
        </div>

        {/* ✅ 3. PASTE CONTEXT MENU HERE */}
        {contextMenu && (
          <div
            className="fixed z-[100] bg-white border border-gray-200 shadow-xl rounded-lg py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={handleAddToNotes}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition font-medium"
            >
              <PenLine className="w-4 h-4" /> Add to Notes
            </button>
          </div>
        )}

        {/* ✅ 4. NEW INPUT UI ... (Your existing form starts here) */}
        <form onSubmit={handleSend}></form>

        {/* ✅ 4. NEW INPUT UI WITH STYLE MANAGER */}
        <form onSubmit={handleSend}>
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="max-w-4xl mx-auto relative flex items-center gap-2">

              {/* 1. INPUT BOX */}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeStyle ? `Ask a question (${activeStyle.name} Mode)...` : "Ask a question..."}
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
              />

              {/* 2. THREE DOTS MENU (Style Manager) */}
              <StyleManager
                activeStyle={activeStyle}
                onStyleSelect={setActiveStyle}
              />

              {/* 3. SEND BUTTON */}
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-md"
              >
                <SendHorizontal className="w-5 h-5" />
              </button>

            </div>

            {/* Optional: Helper Text to confirm style */}
            <div className="max-w-4xl mx-auto mt-1 text-center">
              {activeStyle && (
                <p className="text-[10px] text-blue-500 font-medium">
                  Using Custom Style: {activeStyle.name}
                </p>
              )}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default Chat;