import { useState } from 'react';
import { useNotepad } from '../context/NotepadContext';
import { X, PenLine, Trash2, Calendar } from 'lucide-react';

const Notepad = () => {
  const { notes, addNote, deleteNote, isNotepadOpen, toggleNotepad } = useNotepad();
  const [manualText, setManualText] = useState("");

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    addNote(manualText);
    setManualText("");
  };

  return (
    <div className={`fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isNotepadOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      
      {/* HEADER */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <h2 className="font-bold text-gray-800 flex items-center gap-2">
          <PenLine className="w-4 h-4" /> Research Notepad
        </h2>
        <button onClick={toggleNotepad} className="p-1 hover:bg-gray-200 rounded-full transition">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* MANUAL ENTRY INPUT */}
      <form onSubmit={handleManualSubmit} className="p-4 border-b border-gray-100 bg-white">
        <textarea
          placeholder="Write a quick note..."
          className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 outline-none text-sm mb-2"
          rows="3"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
        />
        <button type="submit" className="w-full py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg text-sm hover:bg-blue-100 transition">
          Add Note
        </button>
      </form>

      {/* NOTES LIST */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {notes.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 text-sm">
            No notes yet.<br/>Highlight text to add one!
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="group bg-white p-4 rounded-xl shadow-sm border border-gray-200 relative hover:shadow-md transition">
              <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed mb-3">{note.text}</p>
              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-500 truncate max-w-[150px]" title={note.source}>
                  {note.source}
                </span>
                <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button 
                onClick={() => deleteNote(note.id)}
                className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notepad;