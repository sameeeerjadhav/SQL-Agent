import { useState, useEffect } from 'react';
import axios from 'axios';
import { DataVisualizer } from './DataVisualizer';
import { Trash2, RefreshCw, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export const Dashboard = () => {
    const [widgets, setWidgets] = useState([]);
    const [loading, setLoading] = useState({});

    // Load widgets from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('pinned_widgets');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setWidgets(parsed);
                // Refresh data for all widgets silently
                parsed.forEach(w => refreshWidgetData(w, true));
            } catch (e) {
                console.error("Failed to parse pinned widgets", e);
            }
        }
    }, []);

    const [currentConnectionUri, setCurrentConnectionUri] = useState(localStorage.getItem('db_connection_uri'));

    // Listen for DB changes
    useEffect(() => {
        const handleDbChange = () => {
            setCurrentConnectionUri(localStorage.getItem('db_connection_uri'));
        };
        window.addEventListener('dbConnectionChanged', handleDbChange);
        return () => window.removeEventListener('dbConnectionChanged', handleDbChange);
    }, []);

    // Filter widgets based on current connection
    const filteredWidgets = widgets.filter(w => {
        // Debugging
        // console.log("Filtering Widget:", w.id, "Widget URI:", w.connectionUri, "Current URI:", currentConnectionUri);

        // Normalize null/undefined to empty string for comparison
        const widgetUri = w.connectionUri || "";
        const currentUri = currentConnectionUri || "";

        return widgetUri === currentUri;
    });

    const refreshWidgetData = async (widget, silent = false) => {
        if (!widget.sql) return;

        setLoading(prev => ({ ...prev, [widget.id]: true }));
        try {
            const response = await axios.post('http://127.0.0.1:8000/execute', {
                sql: widget.sql,
                connection_uri: widget.connectionUri // Use stored URI for execution
            });
            if (response.data.status === 'success') {
                const dataset = response.data.datasets[0];
                setWidgets(prev => prev.map(w =>
                    w.id === widget.id
                        ? { ...w, data: dataset.data, lastUpdated: new Date().toISOString() }
                        : w
                ));
                if (!silent) toast.success('Widget data refreshed');
            }
        } catch (error) {
            console.error(`Failed to refresh widget ${widget.id}`, error);
            if (!silent) toast.error('Failed to refresh widget data');
        } finally {
            setLoading(prev => ({ ...prev, [widget.id]: false }));
        }
    };

    const removeWidget = (id) => {
        const updated = widgets.filter(w => w.id !== id);
        setWidgets(updated);
        localStorage.setItem('pinned_widgets', JSON.stringify(updated));
        toast.success('Widget removed from dashboard');
    };

    if (filteredWidgets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 p-8">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <LayoutDashboard size={32} />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Dashboard is Empty</h3>
                <p className="max-w-xs text-center mt-2">
                    {widgets.length > 0
                        ? "No widgets for this database connection."
                        : "Pin charts from your SQL queries to see them here."}
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 overflow-y-auto h-full bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-500" />
                    Dashboard
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <AnimatePresence>
                        {filteredWidgets.map(widget => (
                            <motion.div
                                key={widget.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden flex flex-col"
                            >
                                <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-xs font-mono text-zinc-500 truncate" title={widget.sql}>
                                            {widget.sql}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => refreshWidgetData(widget)}
                                            className={clsx(
                                                "p-1.5 rounded-md text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors",
                                                loading[widget.id] && "animate-spin text-indigo-500"
                                            )}
                                            title="Refresh Data"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                        <button
                                            onClick={() => removeWidget(widget.id)}
                                            className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                            title="Remove Widget"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 min-h-[300px]">
                                    {loading[widget.id] && !widget.data ? (
                                        <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                                            Loading data...
                                        </div>
                                    ) : !widget.data || widget.data.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm gap-2">
                                            <p>No data available</p>
                                            <button
                                                onClick={() => refreshWidgetData(widget)}
                                                className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-medium hover:underline transition-colors"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    ) : (
                                        <DataVisualizer
                                            data={widget.data}
                                            type={widget.chartType}
                                            // Pass pre-configured config if we saved it, otherwise it auto-detects
                                            initialConfig={widget.chartConfig}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
