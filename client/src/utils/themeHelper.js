import { FileText, Calendar, FileImage, FileSpreadsheet, File } from 'lucide-react';

export const getFileTheme = (filename) => {
    const ext = filename?.split('.').pop().toLowerCase();

    if (['pdf'].includes(ext)) return {
        base: 'red',
        bg: 'bg-red-600',
        text: 'text-red-600 dark:text-red-400',
        light: 'bg-red-50 dark:bg-red-500/20',
        border: 'border-red-500',
        hoverBg: 'hover:bg-red-700',
        gradient: 'from-red-50 to-orange-50',
        iconColor: 'text-red-600 dark:text-red-400',
        lightBorder: 'border-red-100',
        titleColor: 'text-red-800 dark:text-red-400',
        proseColor: 'text-red-900/80',
        Icon: FileText
    };

    if (['doc', 'docx'].includes(ext)) return {
        base: 'blue',
        bg: 'bg-blue-600',
        text: 'text-blue-600 dark:text-blue-400',
        light: 'bg-blue-50 dark:bg-blue-500/20',
        border: 'border-blue-500',
        hoverBg: 'hover:bg-blue-700',
        gradient: 'from-blue-50 to-indigo-50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        lightBorder: 'border-blue-100',
        titleColor: 'text-blue-800 dark:text-blue-400',
        proseColor: 'text-blue-900/80',
        Icon: FileText
    };

    if (['xls', 'xlsx', 'csv'].includes(ext)) return {
        base: 'emerald',
        bg: 'bg-emerald-600',
        text: 'text-emerald-600 dark:text-emerald-400',
        light: 'bg-emerald-50 dark:bg-emerald-500/20',
        border: 'border-emerald-500',
        hoverBg: 'hover:bg-emerald-700',
        gradient: 'from-emerald-50 to-teal-50',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        lightBorder: 'border-emerald-100',
        titleColor: 'text-emerald-800 dark:text-emerald-400',
        proseColor: 'text-emerald-900/80',
        Icon: FileSpreadsheet
    };

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return {
        base: 'purple',
        bg: 'bg-purple-600',
        text: 'text-purple-600 dark:text-purple-400',
        light: 'bg-purple-50 dark:bg-purple-500/20',
        border: 'border-purple-500',
        hoverBg: 'hover:bg-purple-700',
        gradient: 'from-purple-50 to-pink-50',
        iconColor: 'text-purple-600 dark:text-purple-400',
        lightBorder: 'border-purple-100',
        titleColor: 'text-purple-800 dark:text-purple-400',
        proseColor: 'text-purple-900/80',
        Icon: FileImage
    };

    return {
        base: 'gray',
        bg: 'bg-gray-600',
        text: 'text-gray-600 dark:text-gray-400',
        light: 'bg-gray-50 dark:bg-gray-500/20',
        border: 'border-gray-500',
        hoverBg: 'hover:bg-gray-700',
        gradient: 'from-gray-50 to-slate-50',
        iconColor: 'text-gray-600 dark:text-gray-400',
        lightBorder: 'border-gray-100',
        titleColor: 'text-gray-800 dark:text-gray-400',
        proseColor: 'text-gray-900/80',
        Icon: File
    };
};
