import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Plus, MessageSquare, MoreHorizontal, Trash2, Edit2, Pin, Menu, LogOut, ChevronUp, PenLine, Sun, Moon, PanelLeftClose, PanelLeftOpen, Archive, Search } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSidebar } from '../hooks/useSidebar';
import api from '../api/axios';
import SourceSelector from './SourceSelector';
import DeleteModal from './DeleteModal';

import toast, { Toaster } from 'react-hot-toast';
import logo from '../assets/logo.png';
import useAuth from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';


const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [sessions, setSessions] = useState([]);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const { isOpen: isSidebarOpen, isMobile, closeSidebar, openSidebar, toggleSidebar } = useSidebar();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Archive and Search states
  const [isArchiveView, setIsArchiveView] = useState(false);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

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
  const loadSessions = (query = '') => {
    const endpoint = query ? `/sessions/search?q=${query}` : `/sessions?archived=${isArchiveView}`;

    api.get(endpoint)
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
    const timeoutId = setTimeout(() => {
      loadSessions(searchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [location.pathname, isArchiveView, searchQuery]);

  // Handle Search Input Outside Click
  useEffect(() => {
    const handleClickOutsideSearch = (e) => {
      // Don't close if search input is explicitly clicked
      if (searchInputRef.current && !searchInputRef.current.contains(e.target)) {
        if (!searchQuery.trim()) {
          setIsSearchVisible(false);
        }
      }
    };

    if (isSearchVisible) {
      document.addEventListener("mousedown", handleClickOutsideSearch);
    }

    return () => document.removeEventListener("mousedown", handleClickOutsideSearch);
  }, [isSearchVisible, searchQuery]);

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
    <div className={`flex h-screen bg-gray-100 dark:bg-[#15171e] overflow-hidden font-sans relative transition-colors duration-200`}>
      <Toaster position="bottom-center" toastOptions={{
        className: 'dark:bg-gray-800 dark:text-white',
      }} />

      {/* Mobile Backdrop */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

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



      {/* SIDEBAR */}
      <aside className={`
        flex flex-col bg-white dark:bg-[#1c1e21] transition-all duration-300 ease-in-out shrink-0 border-r border-gray-100 dark:border-gray-800/60
        ${isMobile
          ? `fixed inset-y-0 left-0 z-50 w-64 shadow-2xl transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : `relative h-screen ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0'}`
        }
      `}>
        <div className="w-64 flex flex-col h-full">
          {/* LOGO */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50 dark:border-gray-800/60 h-16 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <img src="/logo_mel.png" alt="Logo" className="w-8 h-8 rounded-[7px] shrink-0 object-cover shadow-sm" />
              <span className="font-bold text-gray-900 dark:text-white tracking-tight text-xl truncate whitespace-nowrap">ARIVAGAM</span>
            </div>

            <button
              onClick={closeSidebar}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={20} />
            </button>
          </div>

          {/* NAVIGATION */}
          <div className="p-3 grid grid-cols-2 gap-2 mt-2 border-b border-gray-50 dark:border-gray-800/60 pb-3">
            <button
              onClick={() => {
                if (isArchiveView) return; // Disable new session in archive view
                setIsSourceModalOpen(true);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 w-full p-2.5 bg-white dark:bg-blue-600/10 border border-gray-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm ${isArchiveView ? 'opacity-50 cursor-not-allowed hover:bg-white dark:hover:bg-blue-600/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-gray-100 dark:hover:border-blue-500/20 shadow-none' : 'hover:shadow-md'} font-medium`}
            >
              <Plus className="w-5 h-5" />
              <span className="text-xs">New Session</span>
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className={`flex flex-col items-center justify-center gap-1.5 w-full p-2.5 bg-white dark:bg-blue-600/10 border border-gray-100 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md font-medium
              ${location.pathname === '/dashboard' || location.pathname.startsWith('/folder')
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/20 dark:border-blue-500/30'
                  : ''}`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="text-xs">My Drive</span>
            </button>

            <button
              onClick={() => {
                setIsSearchVisible(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="flex flex-col items-center justify-center gap-1.5 w-full p-2.5 bg-white dark:bg-[#1c1e21] border border-gray-100 dark:border-gray-800/60 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md font-medium"
            >
              <Search className="w-5 h-5" />
              <span className="text-xs">Search</span>
            </button>

            <button
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-blue-500', 'scale-105');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'scale-105');
              }}
              onDrop={async (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-blue-500', 'scale-105');
                const sessionId = e.dataTransfer.getData('sessionId');
                if (sessionId) {
                  try {
                    const newArchiveStatus = !isArchiveView;
                    await api.patch(`/sessions/${sessionId}/archive`, { isArchived: newArchiveStatus });
                    loadSessions(searchQuery);
                    if (location.pathname.includes(sessionId)) navigate('/dashboard');
                  } catch (err) {
                    console.error("Failed to update status", err);
                  }
                }
              }}
              onClick={() => {
                setIsArchiveView(!isArchiveView);
                setSearchQuery('');
                setIsSearchVisible(false);
              }}
              className={`flex flex-col items-center justify-center gap-1.5 w-full p-2.5 border rounded-xl hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white hover:border-blue-600 dark:hover:border-blue-600 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md font-medium
              ${isArchiveView
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-500/30 dark:text-blue-400'
                  : 'bg-white border-gray-100 text-gray-600 dark:bg-[#1c1e21] dark:border-gray-800/60 dark:text-gray-300'}`}
            >
              {isArchiveView ? <MessageSquare className="w-5 h-5" /> : <Archive className="w-5 h-5" />}
              <span className="text-xs">{isArchiveView ? 'Recent' : 'Archive'}</span>
            </button>
          </div>

          {/* RECENT SESSIONS LIST */}
          <div className="flex-1 overflow-y-auto px-3 py-2 mt-2 custom-scrollbar">
            <div className="flex items-center justify-between mb-3 px-1 min-h-[28px]">
              {isSearchVisible ? (
                <div className="w-full relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sessions..."
                    className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs rounded-lg px-8 py-2 outline-none border border-gray-200 dark:border-gray-700 shadow-sm focus:border-blue-500 transition-colors"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              ) : (
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  {searchQuery ? 'Search Results' : (isArchiveView ? 'Archived Sessions' : 'Recent Sessions')}
                </p>
              )}
            </div>
            <div className="space-y-0 pb-10">
              {sessions.map(sess => (
                <div
                  key={sess._id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('sessionId', sess._id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => {
                    if (!renamingId) {
                      navigate(`/chat/${sess._id}`);
                      if (isSearchVisible) {
                        setIsSearchVisible(false);
                        setSearchQuery('');
                      }
                    }
                  }}
                  className={`group relative flex items-center justify-between px-3 py-1 rounded-lg cursor-pointer select-none transition-all duration-200 border
                  ${activeMenuId === sess._id ? 'z-30' : ''}
                  ${location.pathname.includes(sess._id)
                      ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/20'
                      : 'bg-white border-transparent hover:-translate-y-1 hover:shadow-md hover:border-gray-100 dark:bg-transparent dark:hover:bg-gray-800/50 dark:hover:border-gray-700'
                    }`}
                >
                  {/* RENAME INPUT MODE */}
                  {renamingId === sess._id ? (
                    <form onSubmit={submitRename} onClick={e => e.stopPropagation()} className="flex-1 flex gap-1">
                      <input
                        autoFocus
                        className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm rounded px-1 outline-none border border-blue-500 shadow-sm"
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onBlur={submitRename}
                      />
                    </form>
                  ) : (
                    <>
                      {/* SESSION NAME */}
                      <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${location.pathname.includes(sess._id) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-blue-500 dark:text-gray-500 dark:group-hover:text-blue-400'}`} />

                        <span className={`text-sm truncate transition-colors font-medium ${sess.isPinned ? 'text-blue-600 dark:text-blue-400' :
                          location.pathname.includes(sess._id) ? 'text-blue-900 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                          }`}>
                          {sess.name}
                        </span>
                        {/* PIN INDICATOR */}
                        {sess.isPinned && <Pin className="w-3 h-3 text-blue-500 dark:text-blue-400 fill-blue-500 dark:fill-blue-400 flex-shrink-0 ml-auto" />}
                      </div>

                      {/* THREE DOTS MENU (Visible on Hover or Active) */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === sess._id ? null : sess._id);
                          }}
                          className={`p-1 rounded-md transition-opacity ${activeMenuId === sess._id || location.pathname.includes(sess._id) ? 'opacity-100 text-gray-600 dark:text-gray-300' : 'opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400'}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* DROPDOWN MENU */}
                        {activeMenuId === sess._id && (
                          <div ref={menuRef} className="absolute right-0 top-8 w-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button onClick={(e) => initRename(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition">
                              <Edit2 className="w-3 h-3" /> Rename
                            </button>
                            <button onClick={(e) => handlePin(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-400 transition">
                              <Pin className="w-3 h-3" /> {sess.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                            <button onClick={(e) => handleDelete(e, sess._id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
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
          <div className="p-3 border-t border-gray-50 dark:border-gray-800/60 relative" ref={userMenuRef}>

            {/* POPUP MENU */}
            {showUserMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl p-1 animate-in fade-in slide-in-from-bottom-2 z-50">

                {/* User Email Info */}
                <div className="px-3 py-2 border-b border-gray-50 dark:border-gray-700/50 mb-1">
                  <p className="text-gray-900 dark:text-gray-100 text-sm font-bold truncate">{user?.name || 'User'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{user?.email || 'user@example.com'}</p>
                </div>

                {/* Theme Toggle Section */}
                <div className="relative group px-1 mb-1 border-b border-gray-50 dark:border-gray-700/50 pb-1">
                  <button
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"><Sun className="w-4 h-4" /> Theme</div>
                    <ChevronUp className="w-4 h-4 rotate-90" />
                  </button>

                  {/* Side Menu Wrapper with transparent padding to bridge the hover gap */}
                  <div className="absolute left-full top-[-4px] pl-1.5 w-36 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-[60] translate-x-1 group-hover:translate-x-0">
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl p-1">
                      <button
                        onClick={() => toggleTheme('light')}
                        className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-lg transition ${theme === 'light' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <div className="flex items-center gap-2"><Sun className="w-4 h-4" /> Light</div>
                        {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>}
                      </button>
                      <button
                        onClick={() => toggleTheme('dark')}
                        className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-lg transition mt-1 ${theme === 'dark' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <div className="flex items-center gap-2"><Moon className="w-4 h-4" /> Dark</div>
                        {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></div>}
                      </button>
                    </div>
                  </div>
                </div>


                {/* Logout */}
                <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition mt-1">
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}

            {/* MAIN BUTTON - Floating Card Style */}
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`flex items-center gap-3 w-full p-2 rounded-xl transition-all duration-300 border border-transparent
              ${showUserMenu ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-white dark:bg-transparent hover:-translate-y-1 hover:shadow-md hover:border-gray-100 dark:hover:bg-gray-800/50 dark:hover:border-gray-700/50'}
            `}
            >
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white dark:ring-gray-800">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-bold text-blue-900 dark:text-gray-200 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Student</p>
              </div>
              <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </aside >

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col transition-all duration-300 h-screen min-w-0 bg-gray-50 dark:bg-[#15171e] relative">

        {/* Floating Expand Button (Visible only on hover near the top-left area) */}
        {(!isSidebarOpen || isMobile) && (
          <div className="absolute top-0 left-0 w-24 h-24 z-30 group">
            <button
              onClick={openSidebar}
              className="absolute top-4 left-4 p-1 bg-white hover:bg-gray-100 dark:bg-[#1c1e21] dark:hover:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all flex items-center justify-center border border-gray-100 dark:border-gray-800/60 shadow-sm opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto duration-200"
              aria-label="Open sidebar"
            >
              <PanelLeftOpen size={20} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          <Outlet context={{ refreshSessions: loadSessions, activeSessionId, setActiveSessionId, isSidebarOpen, isMobile, openSidebar }} />
        </div>
      </main>
    </div >
  );
};

export default Layout;