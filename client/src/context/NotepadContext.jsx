import { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; 

const NotepadContext = createContext(null);

export const NotepadProvider = ({ children }) => {
  const [notes, setNotes] = useState(() => {
    // Load from local storage on start
    try {
      const saved = localStorage.getItem('arivagam_notes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {console.error(e); return []; }
  });
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);

  // Save to local storage whenever notes change
  useEffect(() => {
    localStorage.setItem('arivagam_notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = (text, source = "Manual Entry") => {
    const newNote = {
      id: uuidv4(),
      text,
      source,
      createdAt: new Date().toISOString(),
    };
    setNotes(prev => [newNote, ...prev]);
    setIsNotepadOpen(true); // Auto-open notepad when a note is added
  };

  const deleteNote = (id) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const toggleNotepad = () => setIsNotepadOpen(prev => !prev);

  return (
    <NotepadContext.Provider value={{ notes, addNote, deleteNote, isNotepadOpen, toggleNotepad }}>
      {children}
    </NotepadContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotepad = () => useContext(NotepadContext);