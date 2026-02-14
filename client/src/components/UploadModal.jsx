import { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../api/axios';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadModal = ({ isOpen, onClose, folderId, onUploadComplete }) => {
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
    setUploading(true);

    for (const file of files) {
      setProgress(prev => ({ ...prev, [file.name]: 'uploading' }));

      const formData = new FormData();
      formData.append('file', file);

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
      className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" /> Upload Files
          </h2>
          <button onClick={onClose} disabled={uploading} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop Zone */}
        <div className="p-6 space-y-4">
          {!uploading && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition group"
            >
              <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition">
                <UploadCloud className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-blue-900">Click to select files</p>
              <p className="text-xs text-blue-600 mt-1 max-w-[200px] text-center">
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
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3 truncate">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700 truncate max-w-[200px]">{file.name}</span>
                  </div>

                  {/* Status Icons */}
                  {progress[file.name] === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                  {progress[file.name] === 'done' && <CheckCircle className="w-4 h-4 text-green-500" />}
                  {progress[file.name] === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                  {!progress[file.name] && <button onClick={() => setFiles(files.filter(f => f !== file))}><X className="w-4 h-4 text-gray-400 hover:text-red-500" /></button>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} disabled={uploading} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
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
