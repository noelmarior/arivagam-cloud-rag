import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Plus, MessageSquare, MoreHorizontal, Trash2, Edit2, Pin, Menu, LogOut, ChevronUp, PenLine } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import SourceSelector from './SourceSelector';
import DeleteModal from './DeleteModal';

import toast, { Toaster } from 'react-hot-toast';
import logo from '../assets/logo.png';
import useAuth from '../hooks/useAuth';


const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();


  const [sessions, setSessions] = useState([]);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Session management states
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);


  // ✅ Global Session Tracker with Persistence
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return sessionStorage.getItem("activeSessionId") || null;
  });

  // Persist Active Session
  useEffect(() => {
    if (activeSessionId) {
      sessionStorage.setItem("activeSessionId", activeSessionId);
    } else {
      sessionStorage.removeItem("activeSessionId");
    }
  }, [activeSessionId]);

  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Load sessions
  const loadSessions = () => {
    api.get('/sessions')
      .then(res => {
        if (Array.isArray(res.data)) {
          // Explicit Client-Side Sort (Safety Net)
          const sorted = res.data.sort((a, b) => {
            // 1. Pinned first
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

            // 2. Recency (lastActive > createdAt > 0)
            const dateA = new Date(a.lastActive || a.createdAt || 0).getTime();
            const dateB = new Date(b.lastActive || b.createdAt || 0).getTime();
            return dateB - dateA; // Descending
          });
          setSessions(sorted);
        } else {
          console.warn("API did not return an array:", res.data);
          setSessions([]);
        }
      })
      .catch(err => {
        console.error("Failed to load sessions:", err);
        setSessions([]);
      });
  };

  useEffect(() => {
    loadSessions();
  }, [location.pathname]);

  // Close session menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);



  const handleStartSession = (fileIds) => {
    setIsSourceModalOpen(false);
    navigate('/chat', { state: { contextFiles: fileIds } });
  };

  // Session Actions
  const handlePin = async (e, session) => {
    e.stopPropagation();
    setActiveMenuId(null);

    const newStatus = !session.isPinned;

    setSessions(prev => {
      const updatedList = prev.map(s =>
        s._id === session._id ? { ...s, isPinned: newStatus } : s
      );

      return updatedList.sort((a, b) => {
        if (a.isPinned === b.isPinned) {
          return new Date(b.lastActive) - new Date(a.lastActive);
        }
        return a.isPinned ? -1 : 1;
      });
    });

    try {
      await api.patch(`/sessions/${session._id}/pin`, { isPinned: newStatus });
    } catch (err) {
      console.error(err);
      toast.error("Failed to pin");
      loadSessions();
    }
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setSessionToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/sessions/${sessionToDelete}`);
      setSessions(prev => prev.filter(s => s._id !== sessionToDelete));
      if (location.pathname.includes(sessionToDelete)) navigate('/dashboard');
      setShowDeleteModal(false);
      setSessionToDelete(null);
    } catch {
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const initRename = (e, sess) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setRenamingId(sess._id);
    setRenameValue(sess.name);
  };

  const submitRename = async (e) => {
    e.preventDefault();
    if (!renameValue.trim()) return setRenamingId(null);
    try {
      await api.put(`/sessions/${renamingId}`, { name: renameValue });
      setSessions(prev =>
        prev.map(s => s._id === renamingId ? { ...s, name: renameValue } : s)
      );
    } catch {
      toast.error("Rename failed");
    }
    setRenamingId(null);
  };

  return (
    <div className={`flex h-screen bg-gray-100 overflow-hidden font-sans relative transition-colors duration-200`}>
      <Toaster position="bottom-center" />

      <SourceSelector
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        onStart={handleStartSession}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title="Delete Session?"
        message="Are you sure you want to delete this session? All chat history will be lost."
      />



      {/* SIDEBAR - FLOATING STYLE */}
      <aside className={`
        fixed left-3 top-3 bottom-0 w-64 z-20 flex flex-col transition-all duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'}
        bg-white rounded-2xl border border-gray-100 shadow-sm
      `}>

        {/* LOGO */}
        <div className="p-5 flex items-center gap-3 border-b border-gray-50">
          <img src="/logo_mel.png" alt="Logo" className="w-12 h-12 rounded-[7px] object-cover shadow-sm" />
          <span className="font-bold text-gray-900 tracking-tight text-2xl relative -top-[3px] -left-[1px]">ARIVAGAM</span>
        </div>

        {/* NAVIGATION */}
        <div className="p-3 space-y-3 mt-2">
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3 bg-white border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md font-medium"
          >
            <Plus className="w-5 h-5" /> New Session
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 bg-white border border-gray-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md font-medium`}
          >
            <BookOpen className="w-5 h-5" /> My Drive
          </button>
        </div>

        {/* RECENT SESSIONS LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Recent Sessions</p>
          <div className="space-y-0 pb-10">
            {sessions.map(sess => (
              <div
                key={sess._id}
                onClick={() => { if (!renamingId) navigate(`/chat/${sess._id}`) }}
                className={`group relative flex items-center justify-between px-3 py-1 rounded-lg cursor-pointer select-none transition-all duration-200 border
                  ${activeMenuId === sess._id ? 'z-30' : ''}
                  ${location.pathname.includes(sess._id)
                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                    : 'bg-white border-transparent hover:-translate-y-1 hover:shadow-md hover:border-gray-100'
                  }`}
              >
                {/* RENAME INPUT MODE */}
                {renamingId === sess._id ? (
                  <form onSubmit={submitRename} onClick={e => e.stopPropagation()} className="flex-1 flex gap-1">
                    <input
                      autoFocus
                      className="w-full bg-white text-gray-900 text-sm rounded px-1 outline-none border border-blue-500 shadow-sm"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={submitRename}
                    />
                  </form>
                ) : (
                  <>
                    {/* SESSION NAME */}
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 ${location.pathname.includes(sess._id) ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-500'}`} />

                      <span className={`text-sm truncate transition-colors font-medium ${sess.isPinned ? 'text-blue-600' :
                        location.pathname.includes(sess._id) ? 'text-blue-900' : 'text-gray-600 group-hover:text-gray-900'
                        }`}>
                        {sess.name}
                      </span>
                      {/* PIN INDICATOR */}
                      {sess.isPinned && <Pin className="w-3 h-3 text-blue-500 fill-blue-500 flex-shrink-0 ml-auto" />}
                    </div>

                    {/* THREE DOTS MENU (Visible on Hover or Active) */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === sess._id ? null : sess._id);
                        }}
                        className={`p-1 rounded-md transition-opacity ${activeMenuId === sess._id || location.pathname.includes(sess._id) ? 'opacity-100 text-gray-600' : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600'}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* DROPDOWN MENU */}
                      {activeMenuId === sess._id && (
                        <div ref={menuRef} className="absolute right-0 top-8 w-32 bg-white border border-gray-100 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button onClick={(e) => initRename(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition">
                            <Edit2 className="w-3 h-3" /> Rename
                          </button>
                          <button onClick={(e) => handlePin(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition">
                            <Pin className="w-3 h-3" /> {sess.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <div className="h-px bg-gray-100 my-1"></div>
                          <button onClick={(e) => handleDelete(e, sess._id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* USER PROFILE MENU (Bottom Bar) */}
        <div className="p-3 border-t border-gray-50 relative" ref={userMenuRef}>

          {/* POPUP MENU */}
          {showUserMenu && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-100 rounded-xl shadow-xl p-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">

              {/* User Email Info */}
              <div className="px-3 py-2 border-b border-gray-50 mb-1">
                <p className="text-gray-900 text-sm font-bold truncate">{user?.name || 'User'}</p>
                <p className="text-gray-500 text-xs truncate">{user?.email || 'user@example.com'}</p>
              </div>



              {/* Logout */}
              <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition mt-1">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}

          {/* MAIN BUTTON - Floating Card Style */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-3 w-full p-2 rounded-xl transition-all duration-300 border border-transparent
              ${showUserMenu ? 'bg-gray-50 border-gray-200' : 'bg-white hover:-translate-y-1 hover:shadow-md hover:border-gray-100'}
            `}
          >
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-bold text-blue-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">Student</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside >


      {/* MAIN CONTENT */}
      {/* Add margin-left to clear the fixed sidebar */}
      <main className={`flex-1 flex flex-col relative z-0 overflow-hidden transition-all duration-300 h-screen ${isSidebarOpen ? 'ml-[270px]' : 'ml-0'}`}>
        <Outlet context={{ refreshSessions: loadSessions, activeSessionId, setActiveSessionId }} />
      </main>

      {/* Toggle Button for Mobile */}
      {
        !isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="absolute bottom-4 left-4 p-3 bg-blue-600 text-white rounded-full shadow-lg z-50 hover:bg-blue-700 md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
        )
      }
    </div >
  );
};

export default Layout;