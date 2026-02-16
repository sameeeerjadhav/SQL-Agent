import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Bot, Loader2, Copy, Check, Plus, MessageSquare, Trash2, Edit2, Menu, X, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import clsx from 'clsx';
import { DataVisualizer } from './DataVisualizer';
import toast from 'react-hot-toast';

export const ChatInterface = ({
    messages,
    onSendMessage,
    isLoading,
    onConfirmSQL,
    sessions = [],
    currentSessionId,
    onNewChat,
    onSelectChat,
    onDeleteChat,
    onRenameChat
}) => {
    const [input, setInput] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [showSidebar, setShowSidebar] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editName, setEditName] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = (behavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const isFirstRender = useRef(true);

    useLayoutEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            // If switching to mobile, auto-hide. 
            // Do NOT auto-show on desktop since user wants it hidden by default.
            if (mobile) setShowSidebar(false);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useLayoutEffect(() => {
        if (isFirstRender.current) {
            scrollToBottom("auto");
            isFirstRender.current = false;
        } else {
            scrollToBottom("smooth");
        }
    }, [messages, isLoading]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('SQL copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const formatSQL = (sql) => {
        if (!sql) return '';
        return sql
            .replace(/\s+/g, ' ') // Remove extra spaces
            .replace(/\s(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|INSERT|UPDATE|DELETE|HAVING|UNION)\s/gi, '\n$1 ')
            .replace(/;\s*$/, ';'); // Ensure semi-colon at end
    };

    const startEditing = (session) => {
        setEditingSessionId(session.id);
        setEditName(session.name);
    };

    const saveEditing = () => {
        if (editingSessionId && onRenameChat) {
            onRenameChat(editingSessionId, editName);
            setEditingSessionId(null);
        }
    };

    return (
        <div className="flex h-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">
            {/* Sidebar (Mobile Overlay + Desktop) */}
            <AnimatePresence mode="wait">
                {showSidebar && (
                    <motion.div
                        initial={{ x: -300, opacity: 0, width: 0 }}
                        animate={{ x: 0, opacity: 1, width: isMobile ? '100%' : '16rem' }} // 16rem = w-64
                        exit={{ x: -300, opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={clsx(
                            "z-20 h-full bg-zinc-100 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden",
                            isMobile ? "absolute inset-0 w-full" : "relative w-64"
                        )}
                    >
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-200">Chats</span>
                            <button
                                onClick={() => setShowSidebar(false)}
                                className="p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                                <PanelLeftClose size={20} />
                            </button>
                        </div>

                        {/* New Chat Button */}
                        <div className="p-4 shrink-0">
                            <button
                                onClick={() => { onNewChat(); if (isMobile) setShowSidebar(false); }}
                                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
                            >
                                <Plus size={18} />
                                New Chat
                            </button>
                        </div>

                        {/* Session List */}
                        <div className="flex-1 overflow-y-auto px-2 space-y-1">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    className={clsx(
                                        "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                                        currentSessionId === session.id
                                            ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                    )}
                                    onClick={() => { onSelectChat(session.id); if (isMobile) setShowSidebar(false); }}
                                >
                                    <MessageSquare size={16} className="shrink-0" />

                                    {editingSessionId === session.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={saveEditing}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEditing()}
                                            autoFocus
                                            className="flex-1 bg-transparent border-b border-indigo-500 focus:outline-none text-sm px-1 py-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    ) : (
                                        <span className="flex-1 text-sm truncate">{session.name}</span>
                                    )}

                                    {/* Action Buttons */}
                                    {!editingSessionId && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startEditing(session); }}
                                                className="p-1 hover:text-indigo-500 rounded"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (confirm('Delete this chat?')) onDeleteChat(session.id); }}
                                                className="p-1 hover:text-red-500 rounded"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Header for Sidebar Toggle */}
                {(!showSidebar || isMobile) && (
                    <div className={clsx(
                        "p-2 flex items-center bg-white dark:bg-zinc-900",
                        !isMobile ? "absolute top-4 left-4 z-10 bg-transparent" : "border-b border-zinc-200 dark:border-zinc-800"
                    )}>
                        <button
                            onClick={() => setShowSidebar(true)}
                            className={clsx(
                                "p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg shadow-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                                !isMobile && "opacity-80 hover:opacity-100"
                            )}
                            title="Open Sidebar"
                        >
                            <PanelLeftOpen size={20} />
                        </button>
                        {isMobile && <span className="ml-2 font-medium text-zinc-900 dark:text-zinc-100">Datalk</span>}
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 md:p-8 space-y-4 md:space-y-8 scrollbar-hide relative">
                    <AnimatePresence initial={false}>
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-50 space-y-4">
                                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                    <Bot size={32} />
                                </div>
                                <p>Start a new conversation...</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={clsx(
                                        "group flex gap-4 max-w-4xl mx-auto",
                                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user'
                                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                        : 'bg-indigo-500 text-white'
                                        }`}>
                                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                    </div>

                                    {/* Message Content */}
                                    <div className={clsx(
                                        "flex-1 min-w-0 space-y-4",
                                        msg.role === 'user' ? "text-right" : "text-left"
                                    )}>
                                        <div className="prose prose-zinc dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800 max-w-none">
                                            {msg.content && (
                                                <div className={clsx(
                                                    "inline-block px-5 py-3 rounded-lg text-sm shadow-sm transition-colors",
                                                    msg.role === 'user'
                                                        ? "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                                                        : "text-zinc-600 dark:text-zinc-300"
                                                )}>
                                                    {msg.content}
                                                </div>
                                            )}

                                            {msg.sql && (
                                                <div className="mt-4 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-left relative group/code transition-colors">
                                                    <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                                                        <span className="text-xs font-mono text-zinc-500">SQL GENERATED</span>
                                                        <button
                                                            onClick={() => copyToClipboard(formatSQL(msg.sql), idx)}
                                                            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors"
                                                            title="Copy SQL"
                                                        >
                                                            {copiedId === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                    <pre className="p-4 font-mono text-xs text-indigo-700 dark:text-indigo-300 overflow-x-auto m-0 whitespace-pre-wrap">
                                                        {formatSQL(msg.sql)}
                                                    </pre>
                                                </div>
                                            )}

                                            {msg.datasets && msg.datasets.map((ds, i) => (
                                                <div key={i} className="mt-6">
                                                    {ds.sql && msg.datasets.length > 1 && (
                                                        <div className="text-xs font-mono text-zinc-500 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                                                            Result {i + 1}: {ds.sql}
                                                        </div>
                                                    )}
                                                    <DataVisualizer data={ds.data} type={ds.type} sql={ds.sql || msg.sql} />
                                                </div>
                                            ))}

                                            {!msg.datasets && msg.data && (
                                                <div className="mt-6">
                                                    <DataVisualizer data={msg.data} type={msg.chartType} sql={msg.sql} />
                                                </div>
                                            )}

                                            {/* Confirmation UI */}
                                            {msg.requiresConfirmation && !msg.isConfirmed && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="mt-4 flex flex-wrap gap-3"
                                                >
                                                    <button
                                                        onClick={() => onConfirmSQL && onConfirmSQL(msg.sql, idx)}
                                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
                                                    >
                                                        <Check size={16} />
                                                        Confirm & Execute
                                                    </button>
                                                    <button
                                                        onClick={() => onConfirmSQL && onConfirmSQL(null, idx)} // Null means cancel
                                                        className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </motion.div>
                                            )}

                                            {msg.isConfirmed && (
                                                <div className="mt-2 text-xs text-zinc-400 italic">
                                                    {msg.isConfirmed === 'cancelled' ? 'Action cancelled.' : 'Action confirmed.'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex gap-4 max-w-4xl mx-auto"
                        >
                            <div className="w-8 h-8 rounded bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Loader2 size={14} className="text-indigo-600 dark:text-indigo-400 animate-spin" />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-zinc-500 text-sm animate-pulse">Processing query...</span>
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} className="h-4" />
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-transparent">
                    <div className="max-w-4xl mx-auto">
                        <form onSubmit={handleSubmit} className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg dark:shadow-2xl p-2 transition-colors group-focus-within:border-zinc-300 dark:group-focus-within:border-zinc-700 group-focus-within:bg-white dark:group-focus-within:bg-zinc-900/80">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask a question about your data..."
                                    className="flex-1 bg-transparent border-none text-zinc-900 dark:text-zinc-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-0 px-4 py-3 text-sm"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isLoading}
                                    className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed m-1"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </form>
                        <div className="text-center mt-3">
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-medium">Powered by Gemini Pro • Local SQL Agent</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
