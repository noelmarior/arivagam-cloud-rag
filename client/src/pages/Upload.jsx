import { useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import api from '../api/axios'; // Import the bridge
import toast, { Toaster } from 'react-hot-toast'; // Import notifications

const Upload = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false); // New: Track if AI is thinking

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const clearFile = () => setFile(null);

  // The Logic: Send file to Backend
  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    const toastId = toast.loading('Uploading & Analyzing (This takes 5s)...');

    try {
      // 1. Send to Backend
      await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // 2. Success!
      toast.success('Document Processed Successfully!', { id: toastId });
      setFile(null); // Reset the form
      
    } catch (err) {
      console.error(err);
      toast.error('Upload failed. Is the server running?', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-gray-50 p-6">
      {/* The Notification Container */}
      <Toaster position="top-center" />

      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8">
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Upload Document</h1>
        <p className="text-gray-500 mb-6">Select a PDF or TXT file to analyze.</p>

        {/* Drop Zone */}
        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <UploadCloud className="w-12 h-12 text-blue-500 mb-3" />
              <p className="mb-2 text-sm text-gray-600 font-semibold">Click to upload</p>
              <p className="text-xs text-gray-500">PDF or TXT (MAX. 5MB)</p>
            </div>
            <input type="file" className="hidden" accept=".pdf,.txt" onChange={handleFileChange} />
          </label>
        ) : (
          /* File Preview */
          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button onClick={clearFile} className="p-1 hover:bg-gray-200 rounded-full transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Action Button */}
        <button
          disabled={!file || loading}
          className={`w-full mt-6 py-3 px-4 rounded-lg font-medium text-white transition ${
            file && !loading ? "bg-blue-600 hover:bg-blue-700 shadow-md" : "bg-gray-300 cursor-not-allowed"
          }`}
          onClick={handleUpload}
        >
          {loading ? 'Processing with AI...' : 'Analyze Document'}
        </button>

      </div>
    </div>
  );
};

export default Upload;