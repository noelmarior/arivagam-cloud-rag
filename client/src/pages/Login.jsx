import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("🔵 Attempting Login with:", email);

    try {
      await login(email, password);
      console.log("✅ Login Success!");
      toast.success("Welcome back!");
      navigate('/dashboard');
    } catch (err) {
      console.error("❌ Login Error:", err);
      const errorMsg = err.response?.data?.error || "Login Failed";
      toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
      <div className="bg-gray-50 p-8 md:p-10 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 transition-all">

        <div className="flex flex-col items-center mb-8">
          <img src="/logo_mel.png" alt="Arivagam Logo" className="w-16 h-16 object-contain mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-500 text-sm mt-1">Please sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" className="text-xs font-medium text-blue-600 hover:text-blue-700">Forgot password?</Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
          >
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          Don't have an account? <Link to="/register" className="text-blue-600 font-bold hover:underline ml-1">Create account</Link>
        </p>
      </div>

      <p className="mt-8 text-xs text-center text-gray-400">
        &copy; {new Date().getFullYear()} Arivagam. All rights reserved.
      </p>
    </div>
  );
};

export default Login; 