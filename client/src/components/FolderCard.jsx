import React from 'react';
import { Folder } from 'lucide-react';
import { getFileTheme } from '../utils/themeHelper';

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
    onNameClick,
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

    // Get Theme for files
    const theme = item.type === 'folder' ? null : getFileTheme(item.fileName || item.name);

    // Icon Helper
    const getIcon = () => {
        if (item.type === 'folder') {
            return <Folder className={`w-7 h-7 ${active ? 'text-blue-700' : 'text-blue-500'}`} />;
        }

        // Use Theme Icon
        const Icon = theme.Icon;
        const colorClass = active ? theme.text.replace('600', '700') : theme.text;

        return <Icon className={`w-7 h-7 ${colorClass}`} />;
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
        ${active ? 'bg-white' : (item.type === 'folder' ? 'bg-blue-50 group-hover:bg-blue-100' : theme.light)}`}>
                {getIcon()}
            </div>

            {/* Name / Rename Input */}
            {isEditing ? (
                <div
                    className="flex items-center justify-center w-full z-50 px-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        autoFocus
                        type="text"
                        className={`text-center text-sm font-medium bg-white border border-blue-500 py-0.5 outline-none shadow-lg min-w-0
                            ${item.type === 'file' ? 'rounded-l border-r-0 flex-1' : 'rounded w-full'}
                        `}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={onRenameSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onRenameSubmit();
                            if (e.key === 'Escape') onRenameCancel();
                            e.stopPropagation();
                        }}
                    />
                    {item.type === 'file' && (
                        <span className="text-sm font-medium text-gray-500 bg-gray-100 border border-blue-500 border-l-0 rounded-r py-0.5 px-1 shadow-lg cursor-not-allowed select-none">
                            {item.fileName.substring(item.fileName.lastIndexOf('.'))}
                        </span>
                    )}
                </div>
            ) : (
                <span
                    onClick={onNameClick}
                    className={`text-sm font-medium truncate w-full text-center px-1 rounded hover:bg-gray-100/50 cursor-text
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
