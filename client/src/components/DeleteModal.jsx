import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, onConfirm, title, message, isDeleting }) => {
    const confirmBtnRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            // Focus the delete button for accessibility and quick action
            // Small timeout to allow render
            setTimeout(() => confirmBtnRef.current?.focus(), 50);

            const handleKeyDown = (e) => {
                if (e.key === 'Escape') onClose();
                if (e.key === 'Enter') onConfirm();
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => window.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose, onConfirm]);

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
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        {title || "Delete Item?"}
                    </h2>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 text-sm leading-relaxed">
                        {message || "Are you sure you want to delete this? This action cannot be undone."}
                    </p>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        ref={confirmBtnRef}
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : "Delete"}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

export default DeleteModal;
