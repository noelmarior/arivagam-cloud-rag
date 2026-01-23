import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, Calendar, FileText } from 'lucide-react';

const FileView = () => {
  const { id } = useParams(); // Get the ID from the URL
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFile = async () => {
      try {
        const res = await api.get(`/files/${id}`);
        setFile(res.data);
      } catch (err) {
        console.error("Error fetching file:", err); // <--- NOW IT IS USED
        setError("Could not load the file. It might have been deleted.");
      } finally {
        setLoading(false);
      }
    };
    fetchFile();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading document...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      
      {/* Back Button */}
      <Link to="/dashboard" className="flex items-center text-gray-500 hover:text-blue-600 mb-6 transition">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{file.fileName}</h1>
            <div className="flex items-center text-gray-500 text-sm mt-1">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(file.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* AI Summary Box */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase tracking-wide">AI Summary</h3>
          <p className="text-blue-900 leading-relaxed">
            {file.summary}
          </p>
        </div>
      </div>

      {/* Full Content */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Full Document Content</h2>
        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
          {file.content}
        </div>
      </div>

    </div>
  );
};

export default FileView;