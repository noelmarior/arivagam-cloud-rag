import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Folder, FileText, X, ChevronRight, CheckCircle, Loader2, Search,
  FileSpreadsheet, FileImage, File
} from 'lucide-react';
import toast from 'react-hot-toast';

const SourceSelector = ({ isOpen, onClose, onStart, customLabel }) => {
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [items, setItems] = useState({ folders: [], files: [] });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);

  // Load Content
  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]); // Wipe selection clean
      setBreadcrumbs([{ id: null, name: 'My Drive' }]); // Optional: Reset to root
      setCurrentFolder(null); // Optional: Reset to root
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchFolder(currentFolder);
    }
  }, [currentFolder, isOpen]);

  if (!isOpen) return null;

  const fetchFolder = async (folderId) => {
    setLoading(true);
    try {
      const res = await api.get(`/folders/${folderId || 'root'}`);
      setItems(res.data);
    } catch (err) {
      console.error("Failed to load folder", err);
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleEnterFolder = (folder) => {
    setBreadcrumbs([...breadcrumbs, { id: folder._id, name: folder.name }]);
    setCurrentFolder(folder._id);
  };

  const handleBreadcrumbClick = (index) => {
    const target = breadcrumbs[index];
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setCurrentFolder(target.id);
  };

  const toggleSelection = (fileId) => {
    setSelectedIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleStart = () => {
    if (selectedIds.length === 0) return toast.error("Please select at least one source.");
    onStart(selectedIds);
  };

  // Helper to get icon based on file extension
  const getIcon = (item, isSelected) => {
    const ext = item.fileName ? item.fileName.split('.').pop().toLowerCase() : '';
    const sizeClass = "w-6 h-6";

    if (['pdf'].includes(ext)) return <FileText className={`${sizeClass} ${isSelected ? 'text-red-600' : 'text-red-500'}`} />;
    if (['doc', 'docx'].includes(ext)) return <FileText className={`${sizeClass} ${isSelected ? 'text-blue-700' : 'text-blue-600'}`} />;
    if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className={`${sizeClass} ${isSelected ? 'text-green-700' : 'text-green-600'}`} />;
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return <FileImage className={`${sizeClass} ${isSelected ? 'text-purple-700' : 'text-purple-600'}`} />;

    // Default
    return <File className={`${sizeClass} ${isSelected ? 'text-gray-600' : 'text-gray-400'}`} />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Select Sources</h2>
            <p className="text-sm text-gray-500">Choose files to include in this session context.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-600 overflow-x-auto">
          {breadcrumbs.map((crumb, idx) => (
            <div key={idx} className="flex items-center whitespace-nowrap">
              {idx > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
              <span
                onClick={() => handleBreadcrumbClick(idx)}
                className={`cursor-pointer hover:text-blue-600 hover:underline ${idx === breadcrumbs.length - 1 ? 'font-bold text-gray-800' : ''}`}
              >
                {crumb.name}
              </span>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* Folders */}
              {items.folders.map(folder => (
                <div
                  key={folder._id}
                  onClick={() => handleEnterFolder(folder)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition group"
                >
                  <Folder className="w-6 h-6 text-blue-500 fill-blue-50" />
                  <span className="text-sm font-medium text-gray-700 truncate">{folder.name}</span>
                </div>
              ))}

              {/* Files */}
              {items.files.map(file => {
                const isSelected = selectedIds.includes(file._id);
                return (
                  <div
                    key={file._id}
                    onClick={() => toggleSelection(file._id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition relative overflow-hidden ${isSelected ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-blue-300'
                      }`}
                  >
                    {/* Dynamic Icon */}
                    {getIcon(file, isSelected)}

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{file.fileName}</p>
                      <p className="text-[10px] text-gray-400">
                        {file.fileName.split('.').pop().toUpperCase()}
                      </p>
                    </div>
                    {isSelected && <div className="absolute top-0 right-0 p-1"><CheckCircle className="w-4 h-4 text-blue-600 fill-white" /></div>}
                  </div>
                );
              })}

              {items.folders.length === 0 && items.files.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400">Empty folder</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-2xl">
          <span className="text-sm font-medium text-gray-600">
            {selectedIds.length} file{selectedIds.length !== 1 && 's'} selected
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition">Cancel</button>
            <button
              onClick={handleStart}
              disabled={selectedIds.length === 0}
              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {customLabel || "Start Session"} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SourceSelector;