import { motion } from 'framer-motion';
import { Terminal, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export const LogsViewer = ({ logs }) => {
    return (
        <div className="max-w-5xl mx-auto w-full h-full flex flex-col bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="flex-1 overflow-y-auto space-y-4 p-4 pr-2">
                {logs.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-800 border-dashed rounded-2xl m-4">
                        <Terminal size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No operations executed yet.</p>
                    </div>
                ) : (
                    logs.map((item) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={item.id}
                            className="p-5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-mono text-zinc-500 bg-white dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">
                                    {item.timestamp}
                                </span>
                                <span className={clsx(
                                    "text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide",
                                    item.status === 'success' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20" : "bg-red-500/10 text-red-600 dark:text-red-500 border border-red-500/20"
                                )}>
                                    {item.status}
                                </span>
                            </div>
                            <div className="relative group/code">
                                <pre className="text-sm font-mono text-indigo-700 dark:text-indigo-200 break-words bg-white dark:bg-zinc-950 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800/50 overflow-x-auto shadow-sm">
                                    {item.sql}
                                </pre>
                            </div>
                            {item.error && (
                                <div className="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-500/10 flex items-start gap-2">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    {item.error}
                                </div>
                            )}
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};
