import { useEffect, useState } from 'react';
import api from '../api/axios'; 
import { FileText, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the brain contents
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await api.get('/files');
        setFiles(res.data);
      } catch (err) {
        console.error("Failed to load files", err);
        setError("Failed to connect to your Digital Brain.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  if (loading) return <div className="p-10 text-center text-gray-500">Loading your knowledge base...</div>;
  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Digital Brain</h1>
          <p className="text-gray-500 mt-1">
            {files.length} document{files.length !== 1 && 's'} indexed and ready.
          </p>
        </div>
        <Link to="/upload" className="bg-black text-white px-5 py-2 rounded-lg font-medium hover:bg-gray-800 transition">
          + Add New
        </Link>
      </div>

      {/* Grid of Knowledge */}
      {files.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Your brain is empty.</p>
          <Link to="/upload" className="text-blue-600 font-medium hover:underline">Upload your first document</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <div key={file._id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition flex flex-col h-full">
              
              {/* Icon & Title */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {file.fileType === 'application/pdf' ? 'PDF' : 'TXT'}
                </span>
              </div>
              
              <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1" title={file.fileName}>
                {file.fileName}
              </h3>

              {/* AI Summary Preview */}
              <p className="text-gray-600 text-sm mb-6 flex-grow line-clamp-3">
                {file.summary || "No summary available."}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                <div className="flex items-center text-gray-400 text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(file.createdAt).toLocaleDateString()}
                </div>
                <Link 
                  to={`/files/${file._id}`} 
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Read More <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;