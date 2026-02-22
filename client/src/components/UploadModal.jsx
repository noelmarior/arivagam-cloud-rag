import { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadModal = ({ isOpen, onClose, folderId, onUploadComplete, sessionId }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);

    // Allowed MIME types
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
      'image/png',
      'image/jpeg',
      'image/webp'
    ];

    const validFiles = selected.filter(f => allowedTypes.includes(f.type));

    if (validFiles.length !== selected.length) {
      toast.error("Some files were skipped. Supported: PDF, TXT, DOCX, XLSX, Images.");
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    // ✅ UX Guard: REMOVED (Allow global uploads)
    // if (!sessionId) {
    //   toast.error("Please enter a Session (Chat) to upload files.");
    //   return;
    // }

    setUploading(true);

    for (const file of files) {
      setProgress(prev => ({ ...prev, [file.name]: 'uploading' }));

      const formData = new FormData();
      formData.append('file', file);

      // ✅ Attach Session ID if available (Critical for RAG)
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      // Strict Folder ID Check
      if (folderId && folderId !== 'root' && folderId !== 'null') {
        formData.append('folderId', folderId);
      }

      try {
        await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setProgress(prev => ({ ...prev, [file.name]: 'done' }));
      } catch (err) {
        console.error("Upload failed:", err.response?.data || err.message);
        setProgress(prev => ({ ...prev, [file.name]: 'error' }));
        if (err.response?.data?.error) toast.error(err.response.data.error);
      }
    }

    setUploading(false);
    onUploadComplete();
    onClose();
    setFiles([]);
    setProgress({});
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[9999] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-[#1c1e21] border border-transparent dark:border-gray-800/60 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800/60 flex justify-between items-center bg-white dark:bg-[#1c1e21] rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Upload Files
          </h2>
          <button onClick={onClose} disabled={uploading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition text-gray-500 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div className="p-6 space-y-4">
          {!uploading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-500/20 hover:border-blue-400 dark:hover:border-blue-400 transition group"
            >
              <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">Click to select files</p>
              <p className="text-xs text-blue-600 dark:text-blue-400/80 mt-1 max-w-[200px] text-center">
                Supported: PDF, TXT, DOCX, XLSX, PNG, JPG
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.docx,.xlsx,image/png,image/jpeg,image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{file.name}</span>
                  </div>

                  {/* Status Icons */}
                  {progress[file.name] === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 dark:text-blue-400 animate-spin" />}
                  {progress[file.name] === 'done' && <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />}
                  {progress[file.name] === 'error' && <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" />}
                  {!progress[file.name] && <button onClick={() => setFiles(files.filter(f => f !== file))}><X className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" /></button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 dark:border-gray-800/60 bg-gray-50 dark:bg-[#15171e] rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition">Cancel</button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default UploadModal;
