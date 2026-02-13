
import { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import landingPageImg from '../assets/landingpage.png';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || "Registration Failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* LEFT COLUMN - INTERACTION */}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full py-3 px-0 bg-transparent border-b border-gray-300 focus:border-black outline-none transition-all placeholder:text-gray-400"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full py-3 px-0 bg-transparent border-b border-gray-300 focus:border-black outline-none transition-all placeholder:text-gray-400"
                placeholder="Create a strong password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
            >
              Sign Up
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

      {/* RIGHT COLUMN - STORYTELLING */}
      <div className="hidden lg:flex w-1/2 bg-gray-900 relative overflow-hidden items-center justify-center p-12">
        <img
          src={landingPageImg}
          alt="App Screenshot"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 to-slate-900/80 z-10" />
        <div className="relative z-20 flex flex-col justify-center h-full text-white text-left w-full pl-8">
          <h2 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
            This is where <br />
            serious learners <br />
            begin.
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