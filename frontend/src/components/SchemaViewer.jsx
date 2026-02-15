import { motion } from 'framer-motion';
import { Database, Table as TableIcon, RefreshCw, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { DataVisualizer } from './DataVisualizer';
import { useState } from 'react';

export const SchemaViewer = ({ schema, tableData, onFetchData, rowLimit, onRefresh }) => {
    const [selectedTable, setSelectedTable] = useState(null);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (onRefresh) await onRefresh();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const handleTableClick = async (table) => {
        setSelectedTable(table);
        setIsTableLoading(true);
        await onFetchData(table); // This should be a promise
        setIsTableLoading(false);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
            {/* Left Panel: Tables List */}
            <div className="w-full md:w-1/3 lg:w-1/4 h-[40%] md:h-full p-4 md:p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-900">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Database className="text-indigo-600 dark:text-indigo-400" size={24} />
                        Tables
                    </h3>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 rounded-lg text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        title="Refresh Schema"
                    >
                        <RefreshCw size={18} className={clsx(isRefreshing && "animate-spin")} />
                    </button>
                </div>

                <div className="space-y-3">
                    {schema.map((table, idx) => (
                        <motion.button
                            key={table}
                            onClick={() => handleTableClick(table)}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={clsx(
                                "w-full text-left border rounded-xl p-4 transition-all group flex items-center gap-3",
                                selectedTable === table
                                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500/50 dark:border-indigo-500"
                                    : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            )}
                        >
                            <div className={clsx(
                                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                selectedTable === table ? "bg-indigo-600 dark:bg-indigo-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                            )}>
                                <TableIcon size={20} />
                            </div>
                            <div>
                                <h4 className={clsx("font-semibold", selectedTable === table ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-700 dark:text-zinc-200")}>
                                    {table}
                                </h4>
                            </div>
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Right Panel: Table Data */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col bg-zinc-100/50 dark:bg-zinc-900/10">
                {selectedTable ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <TableIcon className="text-indigo-600 dark:text-indigo-400" size={24} />
                                {selectedTable}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-zinc-500 font-medium whitespace-nowrap hidden sm:inline">Rows:</span>
                                <span className="text-xs font-mono bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
                                    {rowLimit}
                                </span>
                            </div>
                        </div>

                        {isTableLoading ? (
                            <div className="flex-1 flex items-center justify-center">
                                <RefreshCw size={32} className="animate-spin text-indigo-500" />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                                <DataVisualizer data={tableData} type="table" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 opacity-50">
                        <Database size={64} className="mb-4" />
                        <p className="text-lg font-medium">Select a table to view data</p>
                    </div>
                )}
            </div>
        </div>
    );
};
