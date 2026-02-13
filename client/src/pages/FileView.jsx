import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Calendar, FileText, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

const FileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const res = await api.get(`/files/${id}`);
        setFile(res.data);
      } catch (err) {
        console.error("Error fetching file:", err);
        toast.error("Could not load file. It might be deleted.");
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
  }, [id]);

  // Helper: build correct backend file URL
  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    return `http://localhost:5000/${filePath.replace(/\\/g, "/")}`;
  };

  const handleStartChat = () => {
    navigate('/chat', { state: { contextFiles: [id] } });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!file) {
    return <div className="p-8 text-center text-gray-500">File not found.</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto h-full flex flex-col">

        {/* Back Button */}
        <Link
          to="/dashboard"
          className="flex items-center text-gray-500 hover:text-blue-600 mb-6 transition w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        {/* Header + Summary */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-6">

          {/* 1. FLEX CONTAINER: Changed to 'justify-between' to push button to the right */}
          <div className="flex items-center justify-between mb-6">

            {/* LEFT SIDE: Icon & Title */}
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {file.fileName}
                </h1>
                <div className="flex items-center text-gray-500 text-sm mt-2 font-medium">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {new Date(file.createdAt).toLocaleString('en-GB')}
                </div>
              </div>
            </div>

            {/* RIGHT SIDE: Chat Button (NEW) */}
            <button
              onClick={handleStartChat}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              <MessageSquare className="w-4 h-4" /> Start Session
            </button>

          </div>

          {/* AI Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-xs font-bold text-blue-800 mb-3 uppercase tracking-wider">
              AI Summary
            </h3>
            <div className="text-blue-900/80 text-sm leading-relaxed prose prose-sm max-w-none text-blue-900/80 prose-headings:font-bold prose-p:my-1 prose-li:my-0">
              <ReactMarkdown>{file.summary}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[800px]">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
            <h2 className="font-bold text-gray-700">Document Viewer</h2>
            {file.filePath && (
              <a
                href={getFileUrl(file.filePath)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Open in New Tab
              </a>
            )}
          </div>

          <div className="flex-1 bg-gray-100 relative">
            {file.filePath ? (
              <iframe
                src={getFileUrl(file.filePath)}
                className="w-full h-full absolute inset-0"
                title="PDF Viewer"
              />
            ) : (
              <div className="p-10 text-center">
                <p className="text-gray-500 mb-4">
                  Original PDF not available (old upload).
                </p>
                <div className="prose max-w-none text-left bg-white p-6 rounded shadow text-sm h-96 overflow-auto">
                  {file.content}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default FileView;
