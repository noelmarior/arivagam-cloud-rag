import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import landingPageImg from '../assets/landingpage.png';

const Reset = () => {
    const [email, setEmail] = useState('');
    const [resetError, setResetError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResetError('');
        setIsSuccess(false);
        setIsLoading(true);

        try {
            await axiosInstance.post('/auth/forgot-password', { email });
            setIsSuccess(true);
        } catch (error) {
            if (error.response?.status === 404) {
                setResetError("Action can't be completed");
            } else {
                setResetError('Something went wrong. Please try again.');
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
                        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password</h2>
                        <p className="text-gray-500 mt-2">Enter your email to receive a reset link</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setResetError(''); }}
                                className={`w-full py-3 px-0 bg-transparent border-b ${resetError ? 'border-red-500' : 'border-gray-300'} focus:border-black outline-none transition-all placeholder:text-gray-400`}
                                placeholder="you@example.com"
                                required
                            />
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
                                        <p className="text-sm text-green-700 font-medium">Reset link sent! Check your email.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-gray-600">
                        Remembered your password? <Link to="/login" className="text-black font-bold hover:underline ml-1">Back to login</Link>
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
                        Not to worry. <br /> Let's get you back in.
                    </h2>
                    <p className="text-xl text-blue-100 font-medium max-w-lg border-l-4 border-blue-400 pl-4">
                        Reset your password. Reclaim your workspace.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Reset;
