import { useState, useEffect } from 'react';
import axios from 'axios';
import { Database, ChevronRight, ChevronDown, Table, Columns, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

export const SchemaSidebar = ({ onSelectColumn }) => {
    const [tables, setTables] = useState([]);
    const [expandedTable, setExpandedTable] = useState(null);
    const [columns, setColumns] = useState({});
    const [loading, setLoading] = useState(false);
    const [loadingColumns, setLoadingColumns] = useState(false);

    const [connectionUri, setConnectionUri] = useState(localStorage.getItem('db_connection_uri'));

    useEffect(() => {
        const handleDbChange = () => {
            setConnectionUri(localStorage.getItem('db_connection_uri'));
        };
        window.addEventListener('dbConnectionChanged', handleDbChange);
        return () => window.removeEventListener('dbConnectionChanged', handleDbChange);
    }, []);

    useEffect(() => {
        fetchTables();
    }, [connectionUri]);

    const fetchTables = async () => {
        setLoading(true);
        try {
            const userInfo = localStorage.getItem('user_info');
            const userEmail = userInfo ? JSON.parse(userInfo).email : null;
            // Changed to POST for generic support
            const res = await axios.post(`${API_BASE_URL}/schema`, {
                user_email: userEmail,
                connection_uri: connectionUri
            });
            if (res.data.error) {
                console.error("Schema fetch error:", res.data.error);
                setTables([]);
            } else {
                setTables(res.data.tables || []);
            }
        } catch (err) {
            console.error("Failed to fetch schema", err);
            setTables([]);
        }
        setLoading(false);
    };

    const handleExpand = async (tableName) => {
        if (expandedTable === tableName) {
            setExpandedTable(null);
            return;
        }

        setExpandedTable(tableName);

        if (!columns[tableName]) {
            setLoadingColumns(true);
            try {
                const userInfo = localStorage.getItem('user_info');
                const userEmail = userInfo ? JSON.parse(userInfo).email : null;

                // Use generic schema endpoint for columns
                const res = await axios.post(`${API_BASE_URL}/schema`, {
                    user_email: userEmail,
                    connection_uri: connectionUri,
                    table_name: tableName
                });

                if (res.data.error) {
                    console.error("Column fetch error:", res.data.error);
                } else if (res.data.columns) {
                    setColumns(prev => ({ ...prev, [tableName]: res.data.columns }));
                }
            } catch (err) {
                console.error("Failed to fetch columns", err);
            }
            setLoadingColumns(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 w-64 shrink-0 transition-colors">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                <Database size={16} className="text-zinc-500" />
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Schema Browser</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 size={20} className="animate-spin text-zinc-400" />
                    </div>
                ) : (
                    <div className="space-y-1">
                        {tables.map(table => (
                            <div key={table} className="rounded-lg overflow-hidden">
                                <button
                                    onClick={() => handleExpand(table)}
                                    className={clsx(
                                        "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left",
                                        expandedTable === table ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-zinc-600 dark:text-zinc-400"
                                    )}
                                >
                                    {expandedTable === table ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    <Table size={14} className="opacity-70" />
                                    <span className="truncate">{table}</span>
                                </button>

                                <AnimatePresence>
                                    {expandedTable === table && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-zinc-100/50 dark:bg-zinc-900/50"
                                        >
                                            {loadingColumns && !columns[table] ? (
                                                <div className="py-2 px-8 text-xs text-zinc-400 animate-pulse">Loading cols...</div>
                                            ) : (
                                                <div className="py-1">
                                                    {columns[table]?.map((col, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => onSelectColumn && onSelectColumn(col.name)}
                                                            className="w-full flex items-center gap-2 px-8 py-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
                                                            title={`${col.type} ${col.pk ? '(Primary Key)' : ''}`}
                                                        >
                                                            <Columns size={10} className="opacity-50 group-hover:opacity-100" />
                                                            <span className="font-mono truncate">{col.name}</span>
                                                            <span className="ml-auto text-[10px] opacity-30 group-hover:opacity-60 uppercase">{col.type}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
