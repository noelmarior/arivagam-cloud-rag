import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import api from '../api/axios';
import {
  Folder, FileText, Plus, Loader2, ArrowLeft,
  MessageSquare, Trash2, UploadCloud, Edit2,
  Search, Download, Copy, Scissors, Clipboard, X,
  FileSpreadsheet, FileImage, File
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import UploadModal from '../components/UploadModal';
import DeleteModal from '../components/DeleteModal';
import FolderCard from '../components/FolderCard';

// Debounce helper for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

export default function Dashboard() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { activeSessionId } = useOutletContext() || {}; // Get Global Session
  const searchInputRef = useRef(null);
  const fabRef = useRef(null); // Ref for FAB container


  // Data
  const [data, setData] = useState({ folders: [], files: [], currentFolder: null });
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);

  // State
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // ADVANCED SELECTION STATE
  const [selectedItems, setSelectedItems] = useState([]);
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // RENAME STATE
  const [editingId, setEditingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  // DRAG & DROP STATE
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // CONTEXT MENU & CLIPBOARD STATE
  const [contextMenu, setContextMenu] = useState(null); // { x, y, type: 'item'|'bg', targetId? }
  const [clipboard, setClipboard] = useState({ action: null, items: [] }); // action: 'cut' | 'copy'

  // SELECTION BOX STATE
  const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, currentX, currentY }
  const [isSelecting, setIsSelecting] = useState(false);
  const containerRef = useRef(null);
  const dragStartRef = useRef(null); // To distinguish click vs drag

  // --- 1. Fetch Data ---
  useEffect(() => {
    const fetchContents = async () => {
      setLoading(true);
      try {
        const endpoint = `/folders/${folderId || 'root'}`;
        const res = await api.get(endpoint);

        setData({
          folders: res.data.folders || [],
          files: res.data.files || [],
          currentFolder: res.data.folder || null
        });

        setSelectedItems([]);
        setLastSelectedId(null);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load contents");
      } finally {
        setLoading(false);
      }
    };
    fetchContents();
  }, [folderId]);

  // --- 2. Search Logic ---
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const res = await api.get(`/files/search?query=${debouncedSearch}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Search failed");
      }
    };
    performSearch();
  }, [debouncedSearch]);

  // --- 3. View Logic ---
  const displayFolders = searchResults ? (searchResults.folders || []) : (data.folders || []);
  const displayFiles = searchResults ? (searchResults.files || []) : (data.files || []);
  const isSearching = !!searchResults;

  const allItems = [
    ...displayFolders.map(f => ({ ...f, type: 'folder' })),
    ...displayFiles.map(f => ({ ...f, type: 'file' }))
  ];

  // --- 4. Drag & Drop Logic ---
  const handleDragStart = (e, fileId) => {
    e.dataTransfer.effectAllowed = "move";

    // Check if the dragged item is part of the current selection
    // If so, drag ALL selected items. If not, drag only this item.
    let itemsToDrag = [fileId];
    if (selectedItems.includes(fileId)) {
      itemsToDrag = [...selectedItems];
    }

    e.dataTransfer.setData("draggedItems", JSON.stringify(itemsToDrag));
    e.dataTransfer.setData("fileId", fileId); // Fallback / Primary ID
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    const draggedItemsStr = e.dataTransfer.getData("draggedItems");
    const singleFileId = e.dataTransfer.getData("fileId");
    setDragOverFolderId(null);

    // Parse items to move
    let itemsToMove = [];
    if (draggedItemsStr) {
      try {
        itemsToMove = JSON.parse(draggedItemsStr);
      } catch (e) {
        console.error("Failed to parse dragged items", e);
      }
    }

    // Fallback if no list (shouldn't happen with new logic, but safe to keep)
    if (itemsToMove.length === 0 && singleFileId) {
      itemsToMove = [singleFileId];
    }

    if (itemsToMove.length === 0 || !targetFolderId) return;

    // Prevent moving into itself (mostly for folders, but good check)
    if (itemsToMove.includes(targetFolderId)) return;

    try {
      // Optimistic UI Update
      setData(prev => ({
        ...prev,
        files: prev.files.filter(f => !itemsToMove.includes(f._id)),
        folders: prev.folders.filter(f => !itemsToMove.includes(f._id))
      }));

      // Execute moves
      // We'll run them appropriately based on item type
      // Note: In handleDragStart we mixed fileIds. The backend move endpoint differs for files/folders?
      // Looking at handleDelete, we distinguish types. We need to know types here too.
      // But we only have IDs in drag data.
      // We can look up items in `allItems` state since they are currently visible.

      const movePromises = itemsToMove.map(async (id) => {
        const item = allItems.find(i => i._id === id);
        if (!item) return; // Should be in view

        if (item.type === 'folder') {
          await api.put(`/folders/${id}`, { parentId: targetFolderId });
        } else {
          await api.put(`/files/${id}`, { folderId: targetFolderId });
        }
      });

      await Promise.all(movePromises);

      // Clear selection after move
      setSelectedItems([]);
      setLastSelectedId(null);

      refreshData(); // Refresh to be sure
    } catch (err) {
      console.error(err);
      toast.error("Failed to move some items");
      refreshData();
    }
  };

  const refreshData = async () => {
    try {
      const endpoint = `/folders/${folderId || 'root'}`;
      const res = await api.get(endpoint);
      setData({
        folders: res.data.folders || [],
        files: res.data.files || [],
        currentFolder: res.data.folder || null
      });
    } catch (e) { console.error(e); }
  };


  // --- 5. Selection Logic ---
  const handleItemClick = (e, item) => {
    if (editingId === item._id) return;
    if (contextMenu) setContextMenu(null); // Close menu on click

    const isSelected = selectedItems.includes(item._id);

    if (e.ctrlKey || e.metaKey) {
      if (isSelected) {
        setSelectedItems(prev => prev.filter(id => id !== item._id));
      } else {
        setSelectedItems(prev => [...prev, item._id]);
        setLastSelectedId(item._id);
      }
    }
    else if (e.shiftKey && lastSelectedId) {
      const currentIndex = allItems.findIndex(i => i._id === item._id);
      const lastIndex = allItems.findIndex(i => i._id === lastSelectedId);

      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);

      const rangeIds = allItems.slice(start, end + 1).map(i => i._id);
      setSelectedItems(prev => [...new Set([...prev, ...rangeIds])]);
    }
    else {
      setSelectedItems([item._id]);
      setLastSelectedId(item._id);
    }
  };

  // --- 6. Context Menu Logic ---
  const handleContextMenu = (e, item = null) => {
    e.preventDefault();
    e.stopPropagation();

    if (item) {
      // If right-clicked item is NOT in selection, select it solely
      if (!selectedItems.includes(item._id)) {
        setSelectedItems([item._id]);
        setLastSelectedId(item._id);
      }
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        type: 'item',
        targetId: item._id
      });
    } else {
      // Background click
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        type: 'bg'
      });
    }
  };

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Close FAB menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fabRef.current && !fabRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [fabRef]);

  // --- 7. Rename Logic ---
  const startRename = (id) => {
    const item = allItems.find(i => i._id === id);
    if (!item) return;
    setEditingId(id);

    // If file, strip extension for editing
    if (item.type === 'file') {
      const name = item.fileName;
      const lastDotIndex = name.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        setRenameValue(name.substring(0, lastDotIndex));
      } else {
        setRenameValue(name);
      }
    } else {
      setRenameValue(item.name); // Folders just use name
    }
    setContextMenu(null);
  };

  const handleNameClick = (e, item) => {
    e.stopPropagation();
    if (selectedItems.includes(item._id) && selectedItems.length === 1 && !e.ctrlKey && !e.shiftKey) {
      setTimeout(() => startRename(item._id), 200);
    } else {
      handleItemClick(e, item);
    }
  };

  const submitRename = async () => {
    if (!renameValue.trim() || !editingId) {
      setEditingId(null);
      return;
    }

    const item = allItems.find(i => i._id === editingId);
    if (!item) return;

    let finalName = renameValue.trim();

    // Re-append extension for files
    if (item.type === 'file') {
      const oldName = item.fileName;
      const lastDotIndex = oldName.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        const extension = oldName.substring(lastDotIndex);
        // Check if user accidentally typed extension?
        // Requirement says "not allow me to change", so we strictly append original extension
        // We assume renameValue is JUST the name part
        finalName = finalName + extension;
      }
    }

    const oldName = item.type === 'folder' ? item.name : item.fileName;
    if (oldName === finalName) {
      setEditingId(null);
      return;
    }

    try {
      const endpoint = item.type === 'folder' ? `/folders/${item._id}` : `/files/${item._id}`;
      const payload = item.type === 'folder' ? { name: finalName } : { fileName: finalName };

      await api.put(endpoint, payload);

      // UI Update
      if (item.type === 'folder') {
        setData(prev => ({
          ...prev,
          folders: prev.folders.map(f => f._id === editingId ? { ...f, name: finalName } : f)
        }));
      } else {
        setData(prev => ({
          ...prev,
          files: prev.files.map(f => f._id === editingId ? { ...f, fileName: finalName } : f)
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Rename failed");
    } finally {
      setEditingId(null);
    }
  };

  // --- 8. Clipboard & Actions ---
  const handleCopy = () => {
    if (selectedItems.length === 0) return;
    setClipboard({ action: 'copy', items: [...selectedItems] });
    setContextMenu(null);
  };

  const handleCut = () => {
    if (selectedItems.length === 0) return;
    setClipboard({ action: 'cut', items: [...selectedItems] });
    setContextMenu(null);
  };

  const handlePaste = async () => {
    if (clipboard.items.length === 0) return;
    setContextMenu(null);

    const targetFolderId = folderId || null;

    try {
      for (const id of clipboard.items) {

        if (clipboard.action === 'cut') {
          // Move logic
          await api.put(`/files/${id}`, { folderId: targetFolderId });
        } else {
          // Copy logic - explicit endpoint
          await api.post(`/files/${id}/copy`, { folderId: targetFolderId });
        }
      }
      if (clipboard.action === 'cut') setClipboard({ action: null, items: [] });
      refreshData();
    } catch (err) {
      console.error("Paste error", err);
      // Fallback or specific error handling
      toast.error("Failed to paste items. Feature might be limited.");
    }
  };

  const handleDelete = () => {
    if (selectedItems.length === 0) return;
    setContextMenu(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (selectedItems.length === 0) return;
    setIsDeleting(true);

    try {
      for (const id of selectedItems) {
        const item = allItems.find(i => i._id === id);
        if (item) {
          const endpoint = item.type === 'folder' ? `/folders/${id}` : `/files/${id}`;
          await api.delete(endpoint);
        }
      }

      setData(prev => ({
        ...prev,
        folders: prev.folders.filter(f => !selectedItems.includes(f._id)),
        files: prev.files.filter(f => !selectedItems.includes(f._id))
      }));
      setSelectedItems([]);
      setShowDeleteModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartChat = () => {
    const fileIds = selectedItems.filter(id => {
      const item = allItems.find(i => i._id === id);
      return item && item.type === 'file';
    });
    if (fileIds.length === 0) return toast.error("Select files to chat");
    navigate('/chat', { state: { contextFiles: fileIds } });
  };

  // --- 9. Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingId) {
        if (e.key === 'Enter') submitRename();
        if (e.key === 'Escape') setEditingId(null);
        return;
      }

      // Ctrl+A
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedItems(allItems.map(i => i._id));
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }

      // Cut
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        handleCut();
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // Delete
      if (e.key === 'Delete') {
        e.preventDefault();
        handleDelete();
      }

      // F2 (Rename)
      if (e.key === 'F2') {
        e.preventDefault();
        if (selectedItems.length === 1) {
          startRename(selectedItems[0]);
        }
      }

      // Escape
      if (e.key === 'Escape') {
        if (contextMenu) setContextMenu(null);
        else setSelectedItems([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, editingId, contextMenu, clipboard, allItems]);


  // --- 10. Navigation ---
  const handleDoubleClick = (item) => {
    if (editingId) return;
    if (item.type === 'folder') {
      navigate(`/folder/${item._id}`);
    } else {
      navigate(`/files/${item._id}`);
    }
  };

  const goUp = () => {
    if (data.currentFolder?.parentId) {
      navigate(`/folder/${data.currentFolder.parentId}`);
    } else {
      navigate('/dashboard');
    }
  };

  const handleCreateFolder = async (e) => {
    if (e) e.preventDefault();

    // Default to "New Folder" if empty
    let nameToUse = newFolderName.trim() || "New Folder";

    // Auto-increment name if already exists
    const existingNames = data.folders.map(f => f.name.toLowerCase());
    if (existingNames.includes(nameToUse.toLowerCase())) {
      let counter = 2;
      let originalName = nameToUse;
      while (existingNames.includes(`${originalName} ${counter}`.toLowerCase())) {
        counter++;
      }
      nameToUse = `${originalName} ${counter}`;
    }

    try {
      await api.post('/folders', { name: nameToUse, parentId: folderId || null });
      setNewFolderName("");
      setCreating(false);
      refreshData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create folder");
    }
  };

  const handleUploadComplete = () => {
    refreshData();
  };

  if (loading && !searchResults) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }


  // --- 11. Selection Box Logic ---
  const handleMouseDown = (e) => {
    // Modify: Only start selection if clicking on the background (container) directly
    // and NOT on an item/button/input
    if (e.target.closest('.folder-card') ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      contextMenu
    ) return;

    if (e.currentTarget && e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setSelectedItems([]);
    }

    setIsSelecting(true);
    // Get relative coordinates to the container
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    dragStartRef.current = { x: e.clientX, y: e.clientY };

    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      initialSelected: [...selectedItems] // Keep track of what was selected before starting this drag
    });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !selectionBox) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + containerRef.current.scrollLeft;
    const y = e.clientY - rect.top + containerRef.current.scrollTop;

    setSelectionBox(prev => ({
      ...prev,
      currentX: x,
      currentY: y
    }));

    // Calculate selection box rect
    const boxLeft = Math.min(selectionBox.startX, x);
    const boxTop = Math.min(selectionBox.startY, y);
    const boxWidth = Math.abs(x - selectionBox.startX);
    const boxHeight = Math.abs(y - selectionBox.startY);

    // Filter items intersecting with the box
    const newSelected = [];

    // We need to check intersection with rendered items
    // Since we assigned IDs 'item-[id]' to FolderCards
    allItems.forEach(item => {
      const element = document.getElementById(`item-${item._id}`);
      if (element) {
        // Get element's relative position to container
        const elKeyRect = element.getBoundingClientRect();

        // Convert element rect to container-relative coordinates
        // Actually simpler: check intersection of client rects
        // Box client rect:
        const boxClientLeft = rect.left + boxLeft - containerRef.current.scrollLeft;
        const boxClientTop = rect.top + boxTop - containerRef.current.scrollTop;

        // Intersection check
        const isIntersecting = !(
          elKeyRect.right < boxClientLeft ||
          elKeyRect.left > boxClientLeft + boxWidth ||
          elKeyRect.bottom < boxClientTop ||
          elKeyRect.top > boxClientTop + boxHeight
        );

        if (isIntersecting) {
          newSelected.push(item._id);
        }
      }
    });

    // Merge logic: standard behavior (add to initial selection)
    // Or if ctrl not pressed, just the box selection?
    // Let's implement: Initial + New (Union)
    // If not holding ctrl/shift at start, initial was empty (cleared in MouseDown)

    // Combining unique IDs
    const combined = [...new Set([...selectionBox.initialSelected, ...newSelected])];
    setSelectedItems(combined);
  };

  const handleMouseUp = (e) => {
    if (e && e.currentTarget && e.currentTarget.releasePointerCapture && e.pointerId !== undefined) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) { }
    }
    setIsSelecting(false);
    setSelectionBox(null);
  };

  return (
    <div
      ref={containerRef}
      className="p-6 md:p-10 h-full overflow-y-auto select-none relative"
      onPointerDown={handleMouseDown}
      onPointerMove={handleMouseMove}
      onPointerUp={handleMouseUp}

      onClick={(e) => {
        if (!editingId && !isSelecting) {
          // Check if it was a drag or a click
          if (dragStartRef.current) {
            const dist = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
            if (dist > 5) return; // It was a drag, do not clear
          }
          setSelectedItems([]);
        }
      }}
      onContextMenu={(e) => handleContextMenu(e, null)} // Background context menu
    >

      {/* HEADER */}
      <div className="mb-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="flex items-center gap-3 text-2xl font-bold text-gray-800">
            {folderId ? (
              <button
                onClick={goUp}
                className="p-2 hover:bg-gray-200 rounded-full transition text-gray-600"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            ) : (
              <div className="p-2 bg-blue-50 rounded-lg">
                <Folder className="w-6 h-6 text-blue-600" />
              </div>
            )}
            <span className="truncate max-w-[200px] md:max-w-md">
              {isSearching ? `Search: "${searchQuery}"` : (data.currentFolder ? data.currentFolder.name : "DRIVE")}
            </span>
          </div>

          <div className="flex gap-3">
            {/* Buttons removed for FAB */}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            id="global-search-input"
            name="search"
            ref={searchInputRef}
            type="text"
            autoComplete="off"
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {loading && searchQuery && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
          )}
        </div>
      </div>

      {/* CREATE FOLDER INPUT REMOVED - Using Ghost Card */}

      {/* EMPTY STATE */}
      {!loading && allItems.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Folder className="w-20 h-20 mb-4 opacity-20" />
          <p className="text-lg font-medium">
            {isSearching ? "No results found" : "This folder is empty"}
          </p>
        </div>
      )}

      {/* UNIFIED GRID */}
      {!loading && (allItems.length > 0 || creating) && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 pb-32">
          {/* Ghost Card for Creation */}
          {creating && (
            <FolderCard
              item={{ _id: 'ghost', type: 'folder', name: '' }}
              isGhost={true}
              isEditing={true}
              renameValue={newFolderName}
              setRenameValue={setNewFolderName}
              onRenameSubmit={handleCreateFolder}
              onRenameCancel={() => {
                setCreating(false);
                setNewFolderName("");
              }}
            />
          )}

          {allItems.map(item => {
            const active = selectedItems.includes(item._id);
            const isEditing = editingId === item._id;
            const isDropTarget = dragOverFolderId === item._id;
            const isCut = clipboard.action === 'cut' && clipboard.items.includes(item._id);

            return (
              <FolderCard
                key={item._id}
                id={`item-${item._id}`} // Add ID for selection
                className="folder-card" // Class marker for selection
                item={item}
                isSelected={active}
                isEditing={isEditing}
                renameValue={renameValue}
                setRenameValue={setRenameValue}
                onRenameSubmit={submitRename}
                onRenameCancel={() => setEditingId(null)}
                onClick={(e) => { e.stopPropagation(); handleItemClick(e, item); }}
                onNameClick={(e) => handleNameClick(e, item)}
                onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(item); }}
                onContextMenu={(e) => handleContextMenu(e, item)}
                isDropTarget={isDropTarget}
                isCut={isCut}

                // Drag & Drop
                onDragStart={(e) => item.type === 'file' && handleDragStart(e, item._id)}
                onDragOver={(e) => item.type === 'folder' && handleDragOver(e, item._id)}
                onDragLeave={() => item.type === 'folder' && handleDragLeave()}
                onDrop={(e) => item.type === 'folder' && handleDrop(e, item._id)}
              />
            );
          })}
        </div>
      )}


      {/* SELECTION BOX RENDER */}
      {isSelecting && selectionBox && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
            pointerEvents: 'none',
            zIndex: 50
          }}
          className="bg-blue-500/20 border border-blue-500/50 shadow-sm rounded-sm"
        ></div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'item' ? (
            <>
              <button onClick={handleStartChat} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                <MessageSquare className="w-4 h-4" /> Study with AI
              </button>
              <div className="h-px bg-gray-100 my-1"></div>
              <button onClick={handleCut} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                <Scissors className="w-4 h-4" /> Cut
              </button>
              <button onClick={handleCopy} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                <Copy className="w-4 h-4" /> Copy
              </button>
              {selectedItems.length === 1 && (
                <button onClick={() => startRename(selectedItems[0])} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                  <Edit2 className="w-4 h-4" /> Rename
                </button>
              )}
              <div className="h-px bg-gray-100 my-1"></div>
              <button onClick={handleDelete} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { setCreating(true); setContextMenu(null); }} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                <Plus className="w-4 h-4" /> New Folder
              </button>
              <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                <UploadCloud className="w-4 h-4" /> Upload Files
              </button>
              {clipboard.items.length > 0 && (
                <>
                  <div className="h-px bg-gray-100 my-1"></div>
                  <button onClick={handlePaste} className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 text-left">
                    <Clipboard className="w-4 h-4" /> Paste
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folderId={folderId}
        onUploadComplete={handleUploadComplete}
        sessionId={activeSessionId} // Pass Global Session ID
      />

      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
        title={`Delete ${selectedItems.length} Item${selectedItems.length !== 1 ? 's' : ''}?`}
        message="Are you sure you want to delete these items? This action cannot be undone."
      />

      {/* FAB - Click Outside Listener is handled via a Ref for the container */}
      <div
        ref={fabRef}
        className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3"
      >
        {isMenuOpen && (
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[180px] animate-in slide-in-from-bottom-5 duration-200">
            <button
              onClick={() => {
                setCreating(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-left"
            >
              <Folder className="w-5 h-5" /> New Folder
            </button>
            <button
              onClick={() => {
                setIsUploadOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors text-left"
            >
              <FileText className="w-5 h-5" /> Upload File
            </button>
          </div>
        )}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`
            w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full 
            shadow-lg shadow-blue-300 flex items-center justify-center 
            transition-all duration-300 ease-in-out hover:scale-105 active:scale-95
            ${isMenuOpen ? 'rotate-135' : 'rotate-0'}
          `}
        >
          <Plus className="w-8 h-8 transition-transform duration-300" />
        </button>
      </div>
    </div>
  );
}