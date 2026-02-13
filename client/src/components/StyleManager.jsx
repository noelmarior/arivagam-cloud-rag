import { useState, useEffect, useRef } from 'react';
import { MoreVertical, Plus, Trash2, Check, X } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const StyleManager = ({ onStyleSelect, activeStyle }) => {
  const [styles, setStyles] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const menuRef = useRef(null);

  const [newStyleName, setNewStyleName] = useState("");
  const [newStyleInstruction, setNewStyleInstruction] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchStyles = async () => {
      try {
        const res = await api.get('/styles');
        if (isMounted) setStyles(res.data);
      } catch (err) { console.error(err); }
    };
    fetchStyles();
    
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { isMounted = false; document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  // --- THE DIRECT HANDLER (No Event Defaults) ---
  const handleSaveClick = async () => {
    console.log("🔵 BUTTON CLICKED SUCCESSFULLY"); // Look for this in Console (F12)

    if (!newStyleName || !newStyleInstruction) {
      toast.error("Please fill in both fields");
      return;
    }

    try {
      const toastId = toast.loading("Saving...");
      const res = await api.post('/styles', { 
        name: newStyleName, 
        instruction: newStyleInstruction 
      });
      
      toast.success("Saved!", { id: toastId });
      setStyles(prev => [...prev, res.data]);
      onStyleSelect(res.data);
      
      // Close everything
      setIsModalOpen(false);
      setIsMenuOpen(false);
      setNewStyleName("");
      setNewStyleInstruction("");
    } catch (err) {
      console.error(err);
      toast.error("Save failed. Check console.");
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if(!window.confirm("Delete?")) return;
    try {
      await api.delete(`/styles/${id}`);
      setStyles(prev => prev.filter(s => s._id !== id));
      if (activeStyle?._id === id) onStyleSelect(null);
      toast.success("Deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete style");
    }
  };

  return (
    <div className="relative flex items-center" ref={menuRef}>
      
      {/* 1. Main Trigger Button */}
      <button 
        type="button" 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`p-2 rounded-full hover:bg-gray-100 transition ${activeStyle ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* 2. Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute bottom-12 right-0 w-64 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden z-50">
          <button 
            type="button"
            onClick={() => { setIsModalOpen(true); setIsMenuOpen(false); }}
            className="w-full text-left px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Style
          </button>
          
          <div className="h-px bg-gray-100 mx-2"></div>

          <div className="max-h-60 overflow-y-auto py-1">
            <button 
              type="button"
              onClick={() => { onStyleSelect(null); setIsMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
            >
              <span className={!activeStyle ? "font-semibold text-gray-800" : "text-gray-600"}>Default (Hybrid)</span>
              {!activeStyle && <Check className="w-4 h-4 text-blue-600" />}
            </button>

            {styles.map(style => (
              <div key={style._id} onClick={() => { onStyleSelect(style); setIsMenuOpen(false); }} className="w-full px-4 py-2 text-sm hover:bg-gray-50 flex justify-between cursor-pointer group">
                <span className={`truncate max-w-[150px] ${activeStyle?._id === style._id ? "font-semibold text-blue-700" : "text-gray-700"}`}>{style.name}</span>
                <div className="flex gap-2">
                   {activeStyle?._id === style._id && <Check className="w-3 h-3 text-blue-600" />}
                   <button type="button" onClick={(e) => handleDelete(e, style._id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. The Modal (NO FORM TAGS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-[101]">
            
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">New Answer Style</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            
            {/* INPUTS (Just Divs) */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                <input 
                  autoFocus
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newStyleName}
                  onChange={e => setNewStyleName(e.target.value)}
                  placeholder="e.g. Math Mode"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prompt Instruction</label>
                <textarea 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  rows={4}
                  value={newStyleInstruction}
                  onChange={e => setNewStyleInstruction(e.target.value)}
                  placeholder="e.g. Solve step-by-step..."
                />
              </div>

              {/* DIRECT BUTTON (No Submit) */}
              <button 
                type="button" 
                onClick={handleSaveClick}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-md active:scale-95"
              >
                SAVE STYLE
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default StyleManager;