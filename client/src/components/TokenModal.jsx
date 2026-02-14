import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Key, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';

const TokenModal = ({ isOpen, onClose, onSave, initialToken = '' }) => {
    const [token, setToken] = useState(initialToken);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setToken(initialToken);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, initialToken]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={(e) => {
                e.stopPropagation();
                onClose();
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col transform transition-all scale-100"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Key className="w-5 h-5 text-blue-600" />
                        API Token
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4">
                        Enter your API token below. This will be saved locally to authenticate your requests.
                    </p>
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="password"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onSave(token);
                            onClose();
                        }}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" /> Save Token
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default TokenModal;
