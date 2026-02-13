import React from 'react';
import {
    Folder, FileText, FileSpreadsheet, FileImage, File
} from 'lucide-react';

const FolderCard = ({
    item,
    isSelected,
    isEditing,
    isGhost,
    renameValue,
    setRenameValue,
    onRenameSubmit,
    onRenameCancel,
    onClick,
    onDoubleClick,
    onContextMenu,
    isDropTarget,
    isCut,
    // Drag & Drop props
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    ...props
}) => {
    const active = isSelected;

    // Icon Helper
    const getIcon = () => {
        if (item.type === 'folder') {
            return <Folder className={`w-7 h-7 ${active ? 'text-blue-700' : 'text-blue-500'}`} />;
        }
        const ext = item.fileName ? item.fileName.split('.').pop().toLowerCase() : '';
        if (['pdf'].includes(ext)) {
            return <FileText className={`w-7 h-7 ${active ? 'text-red-700' : 'text-red-600'}`} />;
        }
        if (['doc', 'docx'].includes(ext)) {
            return <FileText className={`w-7 h-7 ${active ? 'text-blue-700' : 'text-blue-600'}`} />;
        }
        if (['xls', 'xlsx', 'csv'].includes(ext)) {
            return <FileSpreadsheet className={`w-7 h-7 ${active ? 'text-emerald-700' : 'text-emerald-600'}`} />;
        }
        if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'mov'].includes(ext)) {
            return <FileImage className={`w-7 h-7 ${active ? 'text-violet-700' : 'text-violet-600'}`} />;
        }
        return <File className={`w-7 h-7 ${active ? 'text-gray-700' : 'text-gray-400'}`} />;
    };

    // Dynamic Border/BG Logic based on type
    const getCardStyles = () => {
        if (active) return 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500';

        // Base styles
        let styles = 'bg-white border-transparent hover:-translate-y-1 hover:shadow-md hover:border-gray-200';

        return styles;
    };

    return (
        <div
            {...props}
            onClick={!isGhost ? onClick : undefined}
            onDoubleClick={!isGhost ? onDoubleClick : undefined}
            onContextMenu={!isGhost ? onContextMenu : undefined}
            draggable={item.type === 'file' && !isGhost}
            onDragStart={!isGhost ? onDragStart : undefined}
            onDragOver={!isGhost && item.type === 'folder' ? onDragOver : undefined}
            onDragLeave={!isGhost && item.type === 'folder' ? onDragLeave : undefined}
            onDrop={!isGhost && item.type === 'folder' ? onDrop : undefined}
            className={`
        ${props.className || ''}
        relative group flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 border
        ${getCardStyles()}
        ${isDropTarget ? 'ring-2 ring-blue-500 bg-blue-50 scale-105' : ''}
        ${isCut ? 'opacity-50' : ''} 
        ${isGhost ? 'border-2 border-dashed border-blue-300 opacity-80' : ''}
      `}
        >
            {/* Icon - with dynamic background */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors 
        ${active ? 'bg-white' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
                {getIcon()}
            </div>

            {/* Name / Rename Input */}
            {isEditing ? (
                <input
                    autoFocus
                    type="text"
                    className="w-full text-center text-sm font-medium bg-white border border-blue-500 rounded px-1 py-0.5 outline-none shadow-lg z-50"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={onRenameSubmit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onRenameSubmit();
                        if (e.key === 'Escape') onRenameCancel();
                        e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span
                    className={`text-sm font-medium truncate w-full text-center px-1 rounded
            ${active ? 'text-blue-900' : 'text-gray-700'}
          `}
                >
                    {item.name || item.fileName}
                </span>
            )}

            {/* Size */}
            {!isEditing && !isGhost && item.type === 'file' && (
                <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-medium">
                    {item.size ? `${(item.size / 1024).toFixed(0)} KB` : 'PDF'}
                </span>
            )}
        </div>
    );
};

export default FolderCard;
