import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../api/axios'; // ✅ ADD THIS - was missing!
import landingPageImg from '../assets/landingpage.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState(''); // ✅ Keep your naming
  const [isLoading, setIsLoading] = useState(false); // ✅ ADD THIS - was missing!

  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError(''); // ✅ Use loginError, not error
    setIsLoading(true);

    try {
      await login(email, password); // ✅ Use useAuth's login function
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.status === 401) {
        setLoginError('Invalid email or password. Please try again.');
      } else {
        setLoginError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 bg-white">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
              <img src="/logo_mel.png" alt="Arivagam Logo" className="w-12 h-12 object-contain" />
              <span className="text-2xl font-bold text-gray-900 tracking-tight">ARIVAGAM</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 mt-2">Please sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setLoginError(''); }}
                className={`w-full py-3 px-0 bg-transparent border-b ${loginError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400`}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setLoginError(''); }}
                className={`w-full py-3 px-0 bg-transparent border-b ${loginError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400 pr-10`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-9 text-gray-500 hover:text-black"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-xs font-medium text-gray-500 hover:text-black">Forgot password?</Link>
              </div>
            </div>

            {/* ✅ Error Message - Uses loginError */}
            {loginError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{loginError}</p>
                    <p className="text-xs text-red-600 mt-1">
                      New here? <Link to="/register" className="font-bold underline hover:text-red-800">Create an account</Link>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading} // ✅ Disable while loading
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In'} {/* ✅ Loading state */}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Don't have an account? <Link to="/register" className="text-black font-bold hover:underline ml-1">Create account</Link>
          </p>
        </div>
        <div className="mt-12 text-xs text-center text-gray-400">
          &copy; {new Date().getFullYear()} Arivagam. All rights reserved.
        </div>
      </div>

      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-12">
        <img src={landingPageImg} alt="App Screenshot" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-slate-900/80 z-10" />
        <div className="relative z-20 flex flex-col justify-center h-full text-white text-left w-full pl-8">
          <h2 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
            Your notes. <br />Organized. <br />Understood. <br />Remembered.
          </h2>
          <p className="text-xl text-blue-100 font-medium max-w-lg border-l-4 border-blue-400 pl-4">
            Upload once. Search smart. Study faster.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;