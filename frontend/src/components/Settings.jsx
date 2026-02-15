import { useState, useEffect } from 'react';
import { useTheme } from './ThemeContext';
import { Moon, Sun, Monitor, Type, Shield, RotateCcw, Save, Archive, Trash2, Download } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Settings = () => {
    const { theme, toggleTheme } = useTheme();
    const [fontSize, setFontSize] = useState(() => localStorage.getItem('sql_font_size') || '14');
    const [rowLimit, setRowLimit] = useState(() => localStorage.getItem('sql_row_limit') || '100');
    const [safeMode, setSafeMode] = useState(() => localStorage.getItem('sql_safe_mode') === 'true');
    const [showSuccess, setShowSuccess] = useState(false);

    // Danger Zone State
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const handleSave = () => {
        localStorage.setItem('sql_font_size', fontSize);
        localStorage.setItem('sql_row_limit', rowLimit);
        localStorage.setItem('sql_safe_mode', safeMode);

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);

        // Trigger a custom event so other components (SqlEditor) can react immediately if needed
        window.dispatchEvent(new Event('settingsChanged'));
    };

    const handleReset = () => {
        setShowResetConfirm(true);
    };

    const confirmReset = () => {
        // Clear all app-specific keys
        localStorage.removeItem('sql_font_size');
        localStorage.removeItem('sql_row_limit');
        localStorage.removeItem('sql_safe_mode');
        localStorage.removeItem('editor_sql');
        localStorage.removeItem('editor_datasets');
        localStorage.removeItem('chat_messages');
        localStorage.removeItem('query_history');
        localStorage.removeItem('pinned_widgets');

        // Reload to apply defaults
        window.location.reload();
    };

    const handleExportData = () => {
        const data = {
            settings: { fontSize, rowLimit, safeMode },
            history: JSON.parse(localStorage.getItem('query_history') || '[]'),
            pinned: JSON.parse(localStorage.getItem('pinned_widgets') || '[]'),
            sql: localStorage.getItem('editor_sql') || ''
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sql-workbench-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 p-6 md:p-12 overflow-y-auto transition-colors duration-300">
            <div className="max-w-3xl mx-auto pb-12">
                <div className="mb-10">
                    <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h2>
                    <p className="text-zinc-500 mt-2">Customize your workbench experience and manage your data.</p>
                </div>

                <div className="space-y-8">
                    {/* Appearance Section */}
                    <Section title="Appearance" icon={Monitor}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-900 dark:text-zinc-200">Interface Theme</h4>
                                <p className="text-sm text-zinc-500">Select your preferred color mode.</p>
                            </div>
                            <div className="bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg flex items-center">
                                <button
                                    onClick={() => theme === 'dark' && toggleTheme()}
                                    className={clsx(
                                        "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                                        theme === 'light' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    <Sun size={16} /> Light
                                </button>
                                <button
                                    onClick={() => theme === 'light' && toggleTheme()}
                                    className={clsx(
                                        "p-2 rounded-md transition-all flex items-center gap-2 text-sm font-medium",
                                        theme === 'dark' ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                                    )}
                                >
                                    <Moon size={16} /> Dark
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-zinc-100 dark:border-zinc-800 my-6" />

                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-900 dark:text-zinc-200">Editor Font Size</h4>
                                <p className="text-sm text-zinc-500">Adjust the code font size in the SQL editor.</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800">{fontSize}px</span>
                                <input
                                    type="range"
                                    min="12"
                                    max="20"
                                    step="1"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(e.target.value)}
                                    className="w-32 accent-indigo-600"
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Query Execution Section */}
                    <Section title="Query Execution" icon={Type}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-900 dark:text-zinc-200">Default Row Limit</h4>
                                <p className="text-sm text-zinc-500">Maximum number of rows to fetch per query.</p>
                            </div>
                            <select
                                value={rowLimit}
                                onChange={(e) => setRowLimit(e.target.value)}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            >
                                <option value="50">50 Rows</option>
                                <option value="100">100 Rows</option>
                                <option value="500">500 Rows</option>
                                <option value="1000">1000 Rows</option>
                            </select>
                        </div>
                    </Section>

                    {/* Safety Section */}
                    <Section title="Safety & Guardrails" icon={Shield}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-900 dark:text-zinc-200">Safe Mode</h4>
                                <p className="text-sm text-zinc-500">Require confirmation before running destructive queries (DROP, DELETE).</p>
                            </div>
                            <button
                                onClick={() => setSafeMode(!safeMode)}
                                className={clsx(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                                    safeMode ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
                                )}
                            >
                                <span
                                    className={clsx(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        safeMode ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        </div>
                    </Section>

                    {/* Data Management Section */}
                    <Section title="Data Retention" icon={Archive}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-zinc-900 dark:text-zinc-200">Export User Data</h4>
                                <p className="text-sm text-zinc-500">Download your settings, history, and pinned dashboards as JSON.</p>
                            </div>
                            <button
                                onClick={handleExportData}
                                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    </Section>

                    {/* Danger Zone */}
                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-2xl p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-6 flex items-center gap-2 border-b border-red-100 dark:border-red-900/20 pb-4">
                            <Trash2 className="text-red-500" size={20} />
                            Danger Zone
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="font-medium text-red-900 dark:text-red-200">Factory Reset</h4>
                                <p className="text-sm text-red-600/70 dark:text-red-400/70">Wipe all local data, settings, and history. This cannot be undone.</p>
                            </div>

                            {!showResetConfirm ? (
                                <button
                                    onClick={handleReset}
                                    className="px-4 py-2 bg-white dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors text-sm font-medium"
                                >
                                    Reset App
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowResetConfirm(false)}
                                        className="px-3 py-2 text-zinc-500 hover:text-zinc-700 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmReset}
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg shadow-red-500/20 transition-all text-sm font-medium"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Action */}
                    <div className="flex items-center justify-end gap-4 pt-4 sticky bottom-6 z-10">
                        <motion.span
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: showSuccess ? 1 : 0, x: showSuccess ? 0 : 10 }}
                            className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-4 py-2 rounded-full text-sm font-medium shadow-sm border border-emerald-200 dark:border-emerald-800"
                        >
                            Settings Saved!
                        </motion.span>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 font-medium"
                        >
                            <Save size={18} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <Icon className="text-indigo-500" size={20} />
            {title}
        </h3>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);
