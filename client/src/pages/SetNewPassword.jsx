import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../api/axios';
import landingPageImg from '../assets/landingpage.png';

const SetNewPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resetError, setResetError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResetError('');
        setIsSuccess(false);

        if (password !== confirmPassword) {
            return setResetError("Passwords do not match");
        }

        setIsLoading(true);

        try {
            await axiosInstance.post(`/auth/reset-password/${token}`, { password });
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error) {
            setResetError(error.response?.data?.error || 'Something went wrong. Please try again.');
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
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Set New Password</h2>
                        <p className="text-gray-500 mt-2">Enter your new password below</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setResetError(''); }}
                                className={`w-full py-3 px-0 bg-transparent border-b ${resetError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400 pr-10`}
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
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); setResetError(''); }}
                                className={`w-full py-3 px-0 bg-transparent border-b ${resetError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400 pr-10`}
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-0 top-9 text-gray-500 hover:text-black"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>

                        {resetError && (
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 font-medium">{resetError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isSuccess && (
                            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-green-700 font-medium">Password updated successfully! Redirecting to login...</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || isSuccess}
                            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Updating...' : 'Set New Password'}
                        </button>
                    </form>

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
                        Almost there.
                    </h2>
                    <p className="text-xl text-blue-100 font-medium max-w-lg border-l-4 border-blue-400 pl-4">
                        Secure your workspace.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SetNewPassword;
