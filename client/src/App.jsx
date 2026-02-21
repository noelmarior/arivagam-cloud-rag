import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import { NotepadProvider } from './context/NotepadContext';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import Reset from './pages/Reset';
import SetNewPassword from './pages/SetNewPassword';
import Layout from './components/Layout';
import FileView from './pages/FileView';
import axiosInstance from './api/axios'; // ✅ ADD THIS

// ✅ Waking Up Screen Component
const WakingUpScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
    <img src="/logo_mel.png" alt="Arivagam Logo" className="w-16 h-16 object-contain animate-pulse" />
    <h2 className="text-2xl font-bold text-gray-800">ARIVAGAM</h2>
    <div className="flex items-center gap-2 text-gray-500">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <span>Starting up server, please wait...</span>
    </div>
    <p className="text-xs text-gray-400">This usually takes 30–60 seconds on first load</p>

    {/* ✅ Progress Bar */}
    <div className="w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
      <div className="h-full bg-black rounded-full animate-[loading_30s_ease-in-out_forwards]" />
    </div>
  </div>
);

function App() {
  const [backendReady, setBackendReady] = useState(false);
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const wakeBackend = async () => {
      // Start a timer - if backend takes >3s, show waking screen
      const wakingTimer = setTimeout(() => {
        setIsWaking(true);
      }, 3000);

      try {
        await axiosInstance.get('/health');
        console.log('✅ Backend is awake');
      } catch (error) {
        console.warn('⚠️ Backend health check failed:', error.message);
        // Don't block the app if health check fails
      } finally {
        clearTimeout(wakingTimer);
        setIsWaking(false);
        setBackendReady(true);
      }
    };

    wakeBackend();
  }, []);

  // ✅ Show waking screen if backend is slow
  if (!backendReady && isWaking) {
    return <WakingUpScreen />;
  }

  // ✅ Show nothing briefly while checking (avoids flash)
  if (!backendReady) {
    return null;
  }

  return (
    <AuthProvider>
      <NotepadProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<Reset />} />
          <Route path="/reset-password/:token" element={<SetNewPassword />} />

          {/* Protected Routes (Locked) */}
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/folder/:folderId" element={<Dashboard />} />
              <Route path="/files/:id" element={<FileView />} />
              <Route path="/chat/:sessionId" element={<Chat />} />
              <Route path="/chat" element={<Chat />} />
            </Route>
          </Route>
        </Routes>
      </NotepadProvider>
    </AuthProvider>
  );
}

export default App;