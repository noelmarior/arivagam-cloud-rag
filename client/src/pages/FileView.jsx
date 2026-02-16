import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import * as XLSX from 'xlsx'; // 📦 NEW: Import Excel Parser
import api from '../api/axios';
import { toast } from 'react-hot-toast';
import { getFileTheme } from '../utils/themeHelper';

const FileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [excelData, setExcelData] = useState(null); // 📊 State for Spreadsheet Data

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

  // 🏗️ NATIVE EXCEL RENDERER LOGIC
  useEffect(() => {
    if (!file) return;

    const displayUrl = file.viewablePath || file.originalPath;
    const isExcel = file.fileType.includes('spreadsheet') || file.fileType.includes('excel');

    if (isExcel && displayUrl) {
      fetch(displayUrl)
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          const workbook = XLSX.read(buffer);
          const sheetName = workbook.SheetNames[0]; // Load first sheet
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of Arrays
          setExcelData(jsonData);
        })
        .catch((err) => console.error("Failed to parse Excel:", err));
    }
  }, [file]);

  const theme = file ? getFileTheme(file.fileName) : {};

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

  // 1. CLOUD LOGIC
  const displayUrl = file.viewablePath || file.originalPath;
  const fileType = file.fileType || '';

  const handleStartChat = () => {
    navigate('/chat', { state: { contextFiles: [id] } });
  };

  // 2. VIEWER LOGIC (The "Magic" Switch)
  const renderViewerContent = () => {

    // STRATEGY A: Text Files (.txt)
    // FIX: Use 'min-h-full' instead of 'h-full' to allow scrolling in parent container
    if (fileType === 'text/plain') {
      return (
        <div className="w-full min-h-full p-8 bg-white">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
            {file.content || "No text content available."}
          </pre>
        </div>
      );
    }

    // STRATEGY B: Excel Files (Native HTML Render) 📊
    // This replaces the broken Google Viewer for .xlsx files
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      if (!excelData) return <div className="p-10 text-center text-gray-400">Loading Spreadsheet...</div>;

      return (
        <div className="w-full min-h-full bg-white overflow-visible">
          <table className="min-w-full border-collapse text-sm text-left">
            <tbody>
              {excelData.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? "bg-gray-100 font-bold border-b-2 border-gray-300 sticky top-0 shadow-sm" : "border-b border-gray-100 hover:bg-gray-50"}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-3 border-r border-gray-100 last:border-none whitespace-nowrap text-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (!displayUrl) {
      return (
        <div className="p-10 text-center">
          <p className="text-gray-500 mb-4">Original file not available.</p>
          <div className="prose max-w-none text-left bg-white p-6 rounded shadow text-sm h-96 overflow-auto">
            {file.summary || file.content || "No content available."}
          </div>
        </div>
      );
    }

    // STRATEGY C: Office Documents (DOCX, PPTX) -> Use Google Docs Viewer
    if (
      fileType.includes('wordprocessingml') || // DOCX
      fileType.includes('presentation') ||     // PPTX
      fileType.includes('msword') ||
      fileType === 'application/pdf'
    ) {
      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(displayUrl)}&embedded=true`;
      return (
        <iframe
          src={googleViewerUrl}
          className="absolute inset-0 w-full h-full border-none"
          title="Office Document Viewer"
        />
      );
    }

    // STRATEGY D: Images
    if (fileType.startsWith('image/')) {
      return (
        <div className="min-h-full w-full flex items-center justify-center p-4">
          <img
            src={displayUrl}
            alt="File Content"
            className="max-w-full h-auto shadow-lg rounded"
          />
        </div>
      );
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto h-full flex flex-col">

        {/* Back Button */}
        <Link
          to={file?.folderId ? `/folder/${file.folderId}` : '/dashboard'}
          className={`flex items-center justify-center ${theme.bg} text-white rounded-full w-10 h-10 ${theme.hoverBg} transition mb-6 shadow-md shrink-0`}
          title={file?.folderId ? "Back to Folder" : "Back to Dashboard"}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Header + Summary */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-6">
            {/* LEFT SIDE: Icon & Title */}
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${theme.light}`}>
                <theme.Icon className={`w-8 h-8 ${theme.iconColor}`} />
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

            {/* RIGHT SIDE: Chat Button */}
            <button
              onClick={handleStartChat}
              className={`flex items-center gap-2 px-4 py-2 ${theme.bg} text-white rounded-lg ${theme.hoverBg} transition shadow-md`}
            >
              <MessageSquare className="w-4 h-4" /> Start Session
            </button>
          </div>

          {/* AI Summary */}
          <div className={`bg-gradient-to-r ${theme.gradient} p-6 rounded-xl border-l-4 ${theme.border} ${theme.lightBorder}`}>
            <h3 className={`text-xs font-bold ${theme.titleColor} mb-3 uppercase tracking-wider`}>
              AI Summary
            </h3>
            <div className={`${theme.proseColor} text-sm leading-relaxed prose prose-sm max-w-none prose-headings:font-bold prose-p:my-1 prose-li:my-0`}>
              <ReactMarkdown>{file.summary}</ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Viewer Container - FIXED SCROLLING */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col min-h-[800px]">

          {/* Header */}
          <div className="h-12 border-b border-gray-100 flex justify-between items-center bg-gray-50 px-4 shrink-0">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Document Viewer</h2>
            {displayUrl && (
              <a
                href={displayUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Open in New Tab
              </a>
            )}
          </div>

          <div className="flex-1 relative bg-gray-100 overflow-auto">
            {renderViewerContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileView;