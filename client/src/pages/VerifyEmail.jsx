import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { Loader, CheckCircle, XCircle } from 'lucide-react';

const VerifyEmail = () => {
    const { token } = useParams();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('Verifying your email...');
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!token || hasFetched.current) return;
        hasFetched.current = true;

        const verify = async () => {
            try {
                const response = await axiosInstance.get(`/auth/verify-email/${token}`);
                setStatus('success');
                setMessage('Verified. Go back the Sign Up page');
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.error || 'Verification failed. The token may be invalid or expired.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
            <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800">{message}</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Email Verified!</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link
                            to="/register"
                            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
                        >
                            Return to Sign Up
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="w-12 h-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Verification Failed</h2>
                        <p className="text-gray-600 mb-6">{message}</p>
                        <Link
                            to="/register"
                            className="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors"
                        >
                            Go to Sign Up
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
