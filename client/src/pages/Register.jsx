import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader, Check, X } from 'lucide-react';
import axiosInstance from '../api/axios';
import landingPageImg from '../assets/landingpage.png';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [registerError, setRegisterError] = useState(''); // ✅ ADD - was missing!
  const [isLoading, setIsLoading] = useState(false);      // ✅ ADD - was missing!

  const [emailStatus, setEmailStatus] = useState('idle');
  const [isEmailValid, setIsEmailValid] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const checkEmail = async (emailValue) => {
    if (!emailValue || !emailValue.includes('@')) {
      setEmailStatus('idle');
      setIsEmailValid(false);
      return;
    }
    setEmailStatus('checking');
    try {
      const response = await axiosInstance.post('/auth/check-email', { email: emailValue });
      if (response.data.exists) {
        setEmailStatus('taken');
        setIsEmailValid(false);
      } else {
        setEmailStatus('available');
        setIsEmailValid(true);
      }
    } catch (error) {
      console.error("Email check failed:", error);
      setEmailStatus('error');
      setIsEmailValid(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (email) checkEmail(email);
    }, 500);
    return () => clearTimeout(timer);
  }, [email]);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (!newPassword) {
      setPasswordError('');
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('Password must have 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special char.');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegisterError(''); // ✅ Use registerError, not error
    setIsLoading(true);

    // ✅ Guard: Block if email is taken
    if (emailStatus === 'taken') {
      setRegisterError('This email is already registered. Please sign in.');
      setIsLoading(false);
      return;
    }

    // ✅ Guard: Block if password is invalid
    if (passwordError || !passwordRegex.test(password)) {
      setRegisterError('Please fix the password errors before submitting.');
      setIsLoading(false);
      return;
    }

    try {
      await register(name, email, password); // ✅ Use useAuth's register function
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.status === 400) {
        setRegisterError(error.response.data.error || 'Registration failed.');
      } else {
        setRegisterError('Something went wrong. Please try again.');
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
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create Account</h2>
            <p className="text-gray-500 mt-2">Join us and start your journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full py-3 px-0 bg-transparent border-b border-gray-300 focus:border-black outline-none transition-all placeholder:text-gray-400"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={`w-full py-3 px-0 bg-transparent border-b ${emailStatus === 'taken' ? 'border-red-500' : emailStatus === 'available' ? 'border-green-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400`}
                placeholder="you@example.com"
                required
              />
              <div className="absolute right-0 top-9">
                {emailStatus === 'checking' && <Loader className="w-5 h-5 animate-spin text-gray-400" />}
                {emailStatus === 'available' && <Check className="w-5 h-5 text-green-500" />}
                {emailStatus === 'taken' && <X className="w-5 h-5 text-red-500" />}
              </div>
              {emailStatus === 'taken' && <p className="text-red-500 text-xs mt-1">Email is already registered</p>}
              {emailStatus === 'available' && <p className="text-green-500 text-xs mt-1">Email is available ✓</p>}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                className={`w-full py-3 px-0 bg-transparent border-b ${passwordError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400 pr-10`}
                placeholder="Create a strong password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-9 text-gray-500 hover:text-black"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>

            {/* ✅ Register Error Message */}
            {registerError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 font-medium">{registerError}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || emailStatus === 'taken' || emailStatus === 'checking'}
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'} {/* ✅ Loading state */}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-black font-bold hover:underline ml-1">Sign in</Link>
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
            This is where <br />serious learners <br />begin.
          </h2>
          <p className="text-xl text-blue-100 font-medium max-w-lg border-l-4 border-purple-400 pl-4">
            Create your space. Own your growth.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;