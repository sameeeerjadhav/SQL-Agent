import { useState, useRef, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from 'recharts';
import {
    Table, BarChart2, TrendingUp, Activity, PieChart as PieIcon, CircleDot,
    Download, Settings, FileText, X, Check, LayoutDashboard
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './ThemeContext';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export const DataVisualizer = ({ data, type = 'table', sql, initialConfig, connectionUri }) => {
    const { theme } = useTheme();
    const [viewMode, setViewMode] = useState(type);
    const [showConfig, setShowConfig] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [pinned, setPinned] = useState(false);
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    const getInitialConfig = () => {
        if (!data || data.length === 0) return { xAxis: '', yAxis: '', labelKey: '' };
        const keys = Object.keys(data[0]);
        // Improved Heuristic: Look for common 'Name'/'Label' fields for X
        const preferredX = keys.find(k => ['name', 'title', 'label', 'category', 'date', 'month', 'year', 'id', 'rollno'].includes(k.toLowerCase()) && typeof data[0][k] === 'string');
        const xAxis = preferredX || keys.find(k => typeof data[0][k] === 'string') || keys[0];

        // Improved Heuristic for Y: Avoid 'id', 'pk'. Prefer 'marks', 'score', 'count', 'price', 'total'
        const numberKeys = keys.filter(k => typeof data[0][k] === 'number');
        const preferredY = numberKeys.find(k => ['marks', 'score', 'price', 'count', 'total', 'amount', 'qty', 'sales'].includes(k.toLowerCase()));
        const fallbackY = numberKeys.find(k => !k.toLowerCase().includes('id') && !k.toLowerCase().includes('pk')) || numberKeys[0];
        const yAxis = preferredY || fallbackY || keys[1] || keys[0];

        return { xAxis, yAxis, labelKey: xAxis };
    };

    const [config, setConfig] = useState(initialConfig || getInitialConfig());

    // Update config when data changes
    useEffect(() => {
        if (!initialConfig) {
            setConfig(getInitialConfig());
        }
    }, [data, initialConfig]);

    // Force table view if no numeric data
    useEffect(() => {
        if (!data || data.length === 0) return;
        const hasNumbers = Object.keys(data[0]).some(k => typeof data[0][k] === 'number');
        if (!hasNumbers && viewMode !== 'table' && viewMode !== 'message') {
            setViewMode('table');
        }
    }, [data, viewMode]);

    const handlePin = () => {
        if (!sql) return;
        const newWidget = {
            id: Date.now(),
            sql: sql,
            chartType: viewMode,
            chartConfig: config,
            connectionUri: connectionUri, // Save context
            timestamp: new Date().toISOString()
        };

        const saved = localStorage.getItem('pinned_widgets');
        const widgets = saved ? JSON.parse(saved) : [];
        widgets.push(newWidget);
        localStorage.setItem('pinned_widgets', JSON.stringify(widgets));
        setPinned(true);
        setTimeout(() => setPinned(false), 2000);
    };

    if (!data || data.length === 0) return null;

    const keys = Object.keys(data[0]);
    const numberKeys = keys.filter(k => typeof data[0][k] === 'number');

    // Colors
    const COLORS = ["#14b8a6", "#6366f1", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#ec4899"];

    // Export Functions
    const exportCSV = () => {
        const headers = keys.join(',');
        const rows = data.map(row => keys.map(k => row[k]).join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.href = encodedUri;
        link.download = "query_result.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDF = async () => {
        if (!containerRef.current) return;

        try {
            const dataUrl = await toPng(containerRef.current, {
                cacheBust: true,
                pixelRatio: 2, // Better quality
                filter: (node) => node.tagName !== 'BUTTON',
                backgroundColor: theme === 'dark' ? '#09090b' : '#ffffff'
            });

            const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (margin * 2);

            // Header
            pdf.setFontSize(16);
            pdf.text("SQL Query Report", margin, margin + 5);

            pdf.setFontSize(10);
            pdf.setTextColor(100);
            const dateStr = new Date().toLocaleString();
            pdf.text(`Generated: ${dateStr}`, margin, margin + 12);

            // SQL Query (Wrapped)
            let startY = margin + 20;
            if (sql) {
                pdf.setFont("courier");
                pdf.setFontSize(8);
                const splitSql = pdf.splitTextToSize(sql, contentWidth);
                pdf.text(splitSql, margin, margin + 20);
                startY = margin + 25 + (splitSql.length * 3);
            }

            // Image
            const imgProps = pdf.getImageProperties(dataUrl);
            const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

            // Check if image fits
            const availableHeight = pageHeight - startY - margin;

            if (imgHeight > availableHeight) {
                const scale = availableHeight / imgHeight;
                pdf.addImage(dataUrl, 'PNG', margin, startY, contentWidth * scale, availableHeight);
            } else {
                pdf.addImage(dataUrl, 'PNG', margin, startY, contentWidth, imgHeight);
            }

            pdf.save(`query_report_${Date.now()}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Failed to export PDF. Check console for details.");
        }
    };

    // Style Helpers
    const chartGridColor = theme === 'dark' ? "#27272a" : "#e4e4e7";
    const chartTextColor = theme === 'dark' ? "#a1a1aa" : "#71717a";
    const tooltipStyle = {
        backgroundColor: theme === 'dark' ? "#18181b" : "#ffffff",
        borderColor: theme === 'dark' ? "#27272a" : "#e4e4e7",
        color: theme === 'dark' ? "#f4f4f5" : "#18181b",
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    };

    const ChartContainer = ({ children }) => (
        <div className="h-[300px] md:h-[400px] w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
                {children}
            </ResponsiveContainer>
        </div>
    );

    // Compact View for Messages (INSERT/UPDATE/DELETE success)
    if (viewMode === 'message' || type === 'message') {
        const msg = data[0]?.message || "Operation completed";
        const rows = data[0]?.rows_affected;

        return (
            <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 flex items-center gap-3 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                    <Check size={16} className="text-emerald-600 dark:text-emerald-500" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{msg}</p>
                    {rows !== undefined && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Rows affected: {rows}</p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors duration-300 flex flex-col">
            {/* Header / Toolbar */}
            <div className="flex flex-col border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'table', icon: Table, label: 'Table' },
                            { id: 'bar', icon: BarChart2, label: 'Bar' },
                            { id: 'line', icon: TrendingUp, label: 'Line' },
                            { id: 'area', icon: Activity, label: 'Area' },
                            { id: 'pie', icon: PieIcon, label: 'Pie' },
                            { id: 'scatter', icon: CircleDot, label: 'Scatter' }
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setViewMode(mode.id)}
                                disabled={mode.id !== 'table' && numberKeys.length === 0}
                                className={clsx(
                                    "px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all whitespace-nowrap",
                                    viewMode === mode.id
                                        ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50",
                                    mode.id !== 'table' && numberKeys.length === 0 && "opacity-50 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent text-zinc-300 dark:text-zinc-700"
                                )}
                            >
                                <mode.icon size={14} />
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* Quick Metric Toggles (New) */}
                    {viewMode !== 'table' && numberKeys.length > 0 && (
                        <div className="flex items-center gap-2 px-4 border-l border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-hide">
                            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Metric:</span>
                            <div className="flex gap-1">
                                {numberKeys.map(key => (
                                    <button
                                        key={key}
                                        onClick={() => setConfig({ ...config, yAxis: key })}
                                        className={clsx(
                                            "px-2 py-1 text-[10px] rounded-full transition-colors font-medium border",
                                            config.yAxis === key
                                                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30"
                                                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                                        )}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
                        {viewMode !== 'table' && (
                            <button
                                onClick={() => setShowConfig(!showConfig)}
                                className={clsx(
                                    "p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors",
                                    showConfig && "bg-zinc-200/50 dark:bg-zinc-800 text-indigo-500"
                                )}
                                title="Configure Chart"
                            >
                                <Settings size={16} />
                            </button>
                        )}

                        {sql && viewMode !== 'table' && (
                            <button
                                onClick={handlePin}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    pinned
                                        ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                )}
                                title={pinned ? "Pinned!" : "Pin to Dashboard"}
                            >
                                <LayoutDashboard size={16} />
                            </button>
                        )}



                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                className={clsx(
                                    "p-2 rounded-lg transition-colors",
                                    showExportMenu
                                        ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                )}
                                title="Export Data"
                            >
                                <Download size={16} />
                            </button>
                            {/* Export Dropdown */}
                            <AnimatePresence>
                                {showExportMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-2 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col py-1"
                                    >
                                        <button onClick={() => { exportCSV(); setShowExportMenu(false); }} className="px-4 py-2 text-left text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2">
                                            <FileText size={12} /> CSV
                                        </button>
                                        <button onClick={() => { exportPDF(); setShowExportMenu(false); }} className="px-4 py-2 text-left text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2">
                                            <FileText size={12} /> PDF
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Configuration Panel */}
                <AnimatePresence>
                    {showConfig && viewMode !== 'table' && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-zinc-100 dark:bg-zinc-950/50 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden"
                        >
                            <div className="p-4 flex flex-wrap gap-6 text-sm">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">X-Axis (Category)</label>
                                    <select
                                        value={config.xAxis}
                                        onChange={(e) => setConfig({ ...config, xAxis: e.target.value, labelKey: e.target.value })}
                                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        {keys.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Y-Axis (Value)</label>
                                    <select
                                        value={config.yAxis}
                                        onChange={(e) => setConfig({ ...config, yAxis: e.target.value })}
                                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-1.5 text-zinc-700 dark:text-zinc-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        {numberKeys.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Visualization Body */}
            <div ref={chartRef} className={clsx(
                "flex-1 bg-white dark:bg-zinc-950 relative",
                viewMode !== 'table' ? "min-h-[250px] md:min-h-[300px]" : "min-h-0"
            )}>
                {viewMode === 'table' && (
                    <div className="w-full overflow-auto max-h-[500px] scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 z-10 shadow-sm">
                                <tr>
                                    {keys.map(k => (
                                        <th key={k} className="px-6 py-3 font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800">{k}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {data.map((row, i) => (
                                    <tr key={i} className="hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors even:bg-zinc-50/80 dark:even:bg-zinc-900/80 bg-white dark:bg-transparent">
                                        {keys.map(k => (
                                            <td key={k} className="px-6 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 border-r border-transparent last:border-r-0">{row[k]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Charts */}
                {viewMode === 'bar' && (
                    <ChartContainer>
                        {numberKeys.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                                No numeric data available for this chart type.
                            </div>
                        ) : (
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                                <XAxis dataKey={config.xAxis} stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: theme === 'dark' ? '#27272a' : '#f4f4f5', opacity: 0.2 }} />
                                <Legend />
                                <Bar dataKey={config.yAxis} fill={COLORS[0]} radius={[4, 4, 0, 0]} animationDuration={1000} />
                            </BarChart>
                        )}
                    </ChartContainer>
                )}

                {viewMode === 'line' && (
                    <ChartContainer>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey={config.xAxis} stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                            <Line type="monotone" dataKey={config.yAxis} stroke={COLORS[1]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1000} />
                        </LineChart>
                    </ChartContainer>
                )}

                {viewMode === 'area' && (
                    <ChartContainer>
                        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                            <XAxis dataKey={config.xAxis} stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke={chartTextColor} fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend />
                            <Area type="monotone" dataKey={config.yAxis} stroke={COLORS[2]} fillOpacity={1} fill="url(#colorY)" animationDuration={1000} />
                        </AreaChart>
                    </ChartContainer>
                )}

                {viewMode === 'pie' && (
                    <ChartContainer>
                        <PieChart>
                            <Pie
                                data={data.slice(0, 10)} // Limit to top 10 for readability
                                dataKey={config.yAxis}
                                nameKey={config.xAxis}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                            >
                                {data.slice(0, 10).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} />
                            <Legend layout="vertical" verticalAlign="middle" align="right" />
                        </PieChart>
                    </ChartContainer>
                )}

                {viewMode === 'scatter' && (
                    <ChartContainer>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                            <XAxis type="category" dataKey={config.xAxis} name={config.xAxis} stroke={chartTextColor} fontSize={10} />
                            <YAxis type="number" dataKey={config.yAxis} name={config.yAxis} stroke={chartTextColor} fontSize={10} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                            <Legend />
                            <Scatter name={config.yAxis} data={data} fill={COLORS[3]}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ChartContainer>
                )}
            </div>
        </div >
    );
};
