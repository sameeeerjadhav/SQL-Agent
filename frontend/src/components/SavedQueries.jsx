import { useState, useEffect } from 'react';
import { Bookmark, Trash2, Play, Plus, Search, MoreVertical } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const SavedQueries = ({ currentSql, onLoadQuery }) => {
    const [queries, setQueries] = useState(() => {
        const saved = localStorage.getItem('saved_queries');
        return saved ? JSON.parse(saved) : [];
    });
    const [search, setSearch] = useState('');
    const [isNaming, setIsNaming] = useState(false);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        localStorage.setItem('saved_queries', JSON.stringify(queries));
    }, [queries]);

    const handleSave = () => {
        if (!currentSql.trim()) return;
        setIsNaming(true);
        setNewName('');
    };

    const confirmSave = (e) => {
        e.preventDefault();
        if (!newName.trim()) return;

        const newQuery = {
            id: Date.now(),
            name: newName,
            sql: currentSql,
            createdAt: new Date().toISOString()
        };

        setQueries([newQuery, ...queries]);
        setIsNaming(false);
    };

    const handleDelete = (id, e) => {
        e.stopPropagation();
        setQueries(queries.filter(q => q.id !== id));
    };

    const filteredQueries = queries.filter(q =>
        q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.sql.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 w-72 shrink-0 transition-colors">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Bookmark size={16} className="text-zinc-500" />
                        Saved Queries
                    </h3>
                    <button
                        onClick={handleSave}
                        disabled={!currentSql.trim()}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title="Bookmark Current Query"
                    >
                        <Plus size={16} />
                    </button>
                </div>

                <AnimatePresence>
                    {isNaming && (
                        <motion.form
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={confirmSave}
                            className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg mb-2 overflow-hidden"
                        >
                            <input
                                autoFocus
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Query Name..."
                                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded px-2 py-1 text-xs mb-2 focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-200"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsNaming(false)}
                                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-500"
                                >
                                    Save
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-2 text-zinc-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search queries..."
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredQueries.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 dark:text-zinc-600">
                        <p className="text-xs">No saved queries found.</p>
                    </div>
                ) : (
                    filteredQueries.map(q => (
                        <div
                            key={q.id}
                            className="group bg-white dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-indigo-300 dark:hover:border-indigo-700/50 transition-all cursor-pointer relative shadow-sm"
                            onClick={() => onLoadQuery(q.sql)}
                        >
                            <div className="flex items-start justify-between mb-1">
                                <h4 className="font-medium text-sm text-zinc-800 dark:text-zinc-200 truncate pr-6">{q.name}</h4>
                                <button
                                    onClick={(e) => handleDelete(q.id, e)}
                                    className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                            <pre className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono line-clamp-2 bg-zinc-50 dark:bg-zinc-900 rounded p-1 mb-2 border border-zinc-100 dark:border-zinc-800 pointer-events-none">
                                {q.sql}
                            </pre>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-400">{new Date(q.createdAt).toLocaleDateString()}</span>
                                <button className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                    <Play size={10} /> Load
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
