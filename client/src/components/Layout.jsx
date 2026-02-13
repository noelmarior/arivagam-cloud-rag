import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, Plus, MessageSquare, MoreHorizontal, Trash2, Edit2, Pin, Menu, LogOut, ChevronUp, PenLine } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import SourceSelector from './SourceSelector';
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

  const menuRef = useRef(null);
  const userMenuRef = useRef(null);

  // Load sessions
  const loadSessions = () => {
    api.get('/sessions')
      .then(res => {
        if (Array.isArray(res.data)) {
          setSessions(res.data);
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

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    setActiveMenuId(null);
    if (!window.confirm("Delete this session?")) return;
    try {
      await api.delete(`/sessions/${id}`);
      setSessions(prev => prev.filter(s => s._id !== id));
      if (location.pathname.includes(id)) navigate('/dashboard');
      toast.success("Deleted");
    } catch {
      toast.error("Delete failed");
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
      toast.success("Renamed");
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

      {/* SIDEBAR */}
      <aside className={`bg-gray-900 text-gray-300 w-64 flex-shrink-0 flex flex-col transition-all duration-300 z-20 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute h-full'}`}>

        {/* LOGO */}
        <div className="p-5 border-b border-gray-800 flex items-center gap-2 text-white font-bold text-lg tracking-wider">
          <img src={logo} alt="Logo" className="w-6 h-6 rounded-full object-cover" />
          <span>ARIVAGAM</span>
        </div>

        {/* NAVIGATION */}
        <div className="p-4 space-y-2">
          <button
            onClick={() => setIsSourceModalOpen(true)}
            className="flex items-center gap-3 w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md"
          >
            <Plus className="w-5 h-5" /> New Session
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition ${location.pathname.includes('/dashboard')
              ? 'bg-gray-800 text-white'
              : 'hover:bg-gray-800/50'
              }`}
          >
            <BookOpen className="w-5 h-5" /> My Drive
          </button>
        </div>

        {/* RECENT SESSIONS LIST */}
        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Recent Sessions</p>
          <div className="space-y-1 pb-10">
            {sessions.map(sess => (
              <div
                key={sess._id}
                onClick={() => { if (!renamingId) navigate(`/chat/${sess._id}`) }}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition select-none ${location.pathname.includes(sess._id) ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/50 text-gray-400'
                  }`}
              >
                {/* RENAME INPUT MODE */}
                {renamingId === sess._id ? (
                  <form onSubmit={submitRename} onClick={e => e.stopPropagation()} className="flex-1 flex gap-1">
                    <input
                      autoFocus
                      className="w-full bg-gray-700 text-white text-sm rounded px-1 outline-none border border-blue-500"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={submitRename}
                    />
                  </form>
                ) : (
                  <>
                    {/* SESSION NAME */}
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      {sess.isPinned && <Pin className="w-3 h-3 text-blue-400 fill-blue-400 flex-shrink-0" />}

                      <span className={`text-sm truncate transition-colors ${sess.isPinned ? 'text-blue-100 font-medium' :
                        location.pathname.includes(sess._id) ? 'text-white' : 'text-gray-400'
                        }`}>
                        {sess.name}
                      </span>
                    </div>

                    {/* THREE DOTS MENU */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === sess._id ? null : sess._id);
                        }}
                        className={`p-1 rounded-md transition ${activeMenuId === sess._id ? 'bg-gray-700 text-white' : 'text-transparent group-hover:text-gray-400 hover:text-white'}`}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* DROPDOWN MENU */}
                      {activeMenuId === sess._id && (
                        <div ref={menuRef} className="absolute right-0 top-8 w-32 bg-gray-800 border border-gray-700 shadow-xl rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                          <button onClick={(e) => initRename(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition">
                            <Edit2 className="w-3 h-3" /> Rename
                          </button>
                          <button onClick={(e) => handlePin(e, sess)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition">
                            <Pin className="w-3 h-3" /> {sess.isPinned ? 'Unpin' : 'Pin'}
                          </button>
                          <div className="h-px bg-gray-700 my-1"></div>
                          <button onClick={(e) => handleDelete(e, sess._id)} className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-900/30 transition">
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
        <div className="p-4 border-t border-gray-800 relative" ref={userMenuRef}>

          {/* POPUP MENU */}
          {showUserMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-1 overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-50">

              {/* User Email Info */}
              <div className="px-3 py-2 border-b border-gray-700 mb-1">
                <p className="text-white text-sm font-bold truncate">{user?.name || 'User'}</p>
                <p className="text-gray-500 text-xs truncate">{user?.email || 'user@example.com'}</p>
              </div>



              {/* Logout */}
              <button onClick={logout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition mt-1">
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}

          {/* MAIN BUTTON */}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`flex items-center gap-3 w-full p-2 rounded-xl transition ${showUserMenu ? 'bg-gray-800' : 'hover:bg-gray-800'}`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 text-left overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">Student</p>
            </div>
            <ChevronUp className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col relative z-0 overflow-hidden">
        <Outlet />
      </main>

      {/* Toggle Button for Mobile */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute bottom-4 left-4 p-3 bg-blue-600 text-white rounded-full shadow-lg z-50 hover:bg-blue-700 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default Layout;