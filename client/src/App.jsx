import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import { NotepadProvider } from './context/NotepadContext';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Register from './pages/Register';
import Layout from './components/Layout';
import FileView from './pages/FileView';

function App() {
  return (
    <AuthProvider>
      <NotepadProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes (Locked) */}
          <Route element={<RequireAuth />}>
            {/* ✅ WRAP PAGES IN LAYOUT SO SIDEBAR APPEARS */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/folder/:folderId" element={<Dashboard />} />
              <Route path="/files/:id" element={<FileView />} />
              {/* Handle both specific session and new session routes */}
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