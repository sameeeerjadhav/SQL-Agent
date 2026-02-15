import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Play, Eraser, AlertCircle, CheckCircle, PanelLeft, PanelRight, Download } from 'lucide-react';
import { DataVisualizer } from './DataVisualizer';
import { SchemaSidebar } from './SchemaSidebar';
import { API_BASE_URL } from '../config';
import { SavedQueries } from './SavedQueries';
import { useTheme } from './ThemeContext';
import Editor from '@monaco-editor/react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const SqlEditor = () => {
    const { theme } = useTheme();

    // Initialize from localStorage or default
    const [sql, setSql] = useState(() => localStorage.getItem('editor_sql') || 'SELECT * FROM products LIMIT 10;');
    const [datasets, setDatasets] = useState(() => {
        const saved = localStorage.getItem('editor_datasets');
        return saved ? JSON.parse(saved) : [];
    });

    // Settings State
    const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('sql_font_size') || '14'));
    const [safeMode, setSafeMode] = useState(() => localStorage.getItem('sql_safe_mode') === 'true');
    const [connectionUri, setConnectionUri] = useState(localStorage.getItem('db_connection_uri'));

    useEffect(() => {
        const handleDbChange = () => {
            setConnectionUri(localStorage.getItem('db_connection_uri'));
            // Clear previous results/errors/query when switching DB
            setDatasets([]);
            setError(null);
            setStatus(null);
            setSql('-- Database changed. Query cleared.\n');
        };
        window.addEventListener('dbConnectionChanged', handleDbChange);
        return () => window.removeEventListener('dbConnectionChanged', handleDbChange);
    }, []);

    useEffect(() => {
        const handleSettingsChange = () => {
            setFontSize(parseInt(localStorage.getItem('sql_font_size') || '14'));
            setSafeMode(localStorage.getItem('sql_safe_mode') === 'true');
        };
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [status, setStatus] = useState(null);

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('editor_sql', sql);
    }, [sql]);

    useEffect(() => {
        localStorage.setItem('editor_datasets', JSON.stringify(datasets));
    }, [datasets]);

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Layout State
    const [showSchema, setShowSchema] = useState(!isMobile);
    const [showSaved, setShowSaved] = useState(false); // Default closed in new design

    // Auto-close on mobile when mounting or resizing significantly (optional, but good for UX)
    useEffect(() => {
        if (isMobile) {
            setShowSchema(false);
            setShowSaved(false);
        } else {
            setShowSchema(true);
            setShowSaved(true);
        }
    }, [isMobile]);

    const editorRef = useRef(null);

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;

        // Add "Run" command (Ctrl+Enter / Cmd+Enter)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            handleExecute();
        });
    };

    // Listen for DB changes
    useEffect(() => {
        const handleDbChange = () => {
            setConnectionUri(localStorage.getItem('db_connection_uri'));
            // Clear previous results/errors/query when switching DB
            setDatasets([]);
            setError(null);
            setStatus(null);
            const msg = '-- Database changed. Query cleared.\n';
            setSql(msg);
            if (editorRef.current) {
                editorRef.current.setValue(msg);
            }
        };
        window.addEventListener('dbConnectionChanged', handleDbChange);
        return () => window.removeEventListener('dbConnectionChanged', handleDbChange);
    }, []);

    const handleExecute = async () => {
        let queryToExecute = sql;

        // Check for selection in Monaco
        const editor = editorRef.current;
        if (editor) {
            const selection = editor.getSelection();
            if (!selection.isEmpty()) {
                queryToExecute = editor.getModel().getValueInRange(selection);
            }
        }

        if (!queryToExecute.trim()) return;

        // Safe Mode Check
        if (safeMode) {
            const upper = queryToExecute.toUpperCase();
            if (upper.includes('DROP') || upper.includes('DELETE') || upper.includes('UPDATE') || upper.includes('ALTER')) {
                if (!window.confirm("⚠️ SAFE MODE WARNING ⚠️\n\nYou are about to run a potentially destructive query (DROP/DELETE/UPDATE). Are you sure?")) {
                    return;
                }
            }
        }

        setLoading(true);
        setError(null);
        setStatus(null);
        // Don't clear datasets immediately to avoid flicker, or clear if you prefer
        // setDatasets([]); 

        try {
            const userInfo = localStorage.getItem('user_info');
            const userEmail = userInfo ? JSON.parse(userInfo).email : null;
            const res = await axios.post(`${API_BASE_URL}/execute`, {
                sql: queryToExecute,
                user_email: userEmail,
                connection_uri: connectionUri
            });
            if (res.data.status === 'success') {
                setDatasets(res.data.datasets || []);
                setStatus('Query executed successfully');
            } else {
                setError(res.data.error_message || 'Execution failed');
            }
        } catch (err) {
            setError("Network Error: Could not reach backend.");
        }
        setLoading(false);
    };

    const insertText = (text) => {
        const editor = editorRef.current;
        if (editor) {
            const position = editor.getPosition();
            editor.executeEdits('schema-sidebar', [{
                range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column
                },
                text: text,
                forceMoveMarkers: true
            }]);
            editor.focus();
        } else {
            setSql(prev => prev + text); // Fallback
        }
    };

    return (
        <div className="flex h-full bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative font-sans">

            {/* Left Sidebar: Schema (Collapsible) */}
            <AnimatePresence initial={false}>
                {showSchema && (
                    <motion.div
                        initial={isMobile ? { x: -300, opacity: 0 } : { width: 0, opacity: 0 }}
                        animate={isMobile ? { x: 0, opacity: 1 } : { width: 'auto', opacity: 1 }}
                        exit={isMobile ? { x: -300, opacity: 0 } : { width: 0, opacity: 0 }}
                        className={clsx(
                            "overflow-hidden bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-20 flex-shrink-0",
                            isMobile ? "absolute inset-y-0 left-0 shadow-2xl h-full w-[85%] max-w-[300px]" : "relative h-full w-64"
                        )}
                    >
                        <SchemaSidebar onSelectColumn={insertText} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">

                {/* Modern Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900/50 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowSchema(!showSchema)}
                            className={clsx("p-2 rounded-lg transition-colors", showSchema ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800")}
                            title={showSchema ? "Hide Schema" : "Show Schema"}
                        >
                            <PanelLeft size={20} />
                        </button>
                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
                        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 hidden sm:block">Query Editor</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setSql('');
                                editorRef.current?.setValue('');
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                            <Eraser size={16} />
                            <span className="hidden sm:inline">Clear</span>
                        </button>

                        <button
                            onClick={handleExecute}
                            disabled={loading}
                            className={clsx(
                                "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]",
                                loading ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02]"
                            )}
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play size={16} fill="currentColor" />}
                            <span>Run Query</span>
                            <span className="hidden sm:inline opacity-70 font-normal text-xs ml-1">(Cmd+Enter)</span>
                        </button>

                        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                        <button
                            onClick={() => setShowSaved(true)}
                            className={clsx("p-2 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors", showSaved && "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10")}
                            title="Open Saved Queries"
                        >
                            <PanelRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Split View Container */}
                <div className="flex-1 flex flex-col p-4 md:p-6 gap-4 overflow-hidden">

                    {/* Editor Card */}
                    <div className="flex-shrink-0 h-[45%] bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-shadow">
                        <Editor
                            height="100%"
                            defaultLanguage="sql"
                            value={sql}
                            theme={theme === 'dark' ? "vs-dark" : "light"}
                            onChange={(value) => setSql(value)}
                            onMount={handleEditorDidMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: fontSize,
                                lineNumbers: 'on',
                                roundedSelection: false,
                                scrollBeyondLastLine: false,
                                readOnly: false,
                                automaticLayout: true,
                                padding: { top: 20, bottom: 20 },
                                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                                fontLigatures: true,
                            }}
                        />
                    </div>

                    {/* Results Card */}
                    <div className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col min-h-0">
                        {/* Results Header */}
                        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Results</h3>
                            <div className="flex items-center gap-2">
                                {status && (
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
                                        <CheckCircle size={12} /> {status}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-auto p-4 md:p-6 custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {error ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 flex flex-col gap-2 items-center justify-center text-center h-full"
                                    >
                                        <div className="p-3 bg-red-100 dark:bg-red-500/20 rounded-full mb-2">
                                            <AlertCircle size={32} />
                                        </div>
                                        <h4 className="font-bold">Execution Error</h4>
                                        <pre className="text-sm font-mono whitespace-pre-wrap max-w-full overflow-x-auto">{error}</pre>
                                    </motion.div>
                                ) : datasets.length > 0 ? (
                                    <div className="space-y-10">
                                        {datasets.map((ds, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                {datasets.length > 1 && (
                                                    <div className="mb-4 flex items-center gap-3">
                                                        <span className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">{idx + 1}</span>
                                                        {ds.sql && <code className="text-xs text-zinc-400 font-mono truncate max-w-md">{ds.sql}</code>}
                                                    </div>
                                                )}
                                                {ds.type === 'error' ? (
                                                    <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start gap-3 text-sm text-red-600 dark:text-red-400">
                                                        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                                                        <div className="font-mono whitespace-pre-wrap">{ds.data?.[0]?.error || 'Unknown Error'}</div>
                                                    </div>
                                                ) : (
                                                    <DataVisualizer data={ds.data} type={ds.type === 'table' ? 'table' : 'message'} sql={ds.sql} connectionUri={connectionUri} />
                                                )}
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700">
                                        <Play size={48} className="mb-4 opacity-50" />
                                        <p className="font-medium">Run a query to see results</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Mobile/Floating Backdrop */}
                {isMobile && (showSchema) && (
                    <div
                        className="absolute inset-0 bg-black/50 z-10 backdrop-blur-sm"
                        onClick={() => setShowSchema(false)}
                    />
                )}
            </div>

            {/* Right Sidebar: Saved Queries (Drawer) */}
            <AnimatePresence>
                {showSaved && (
                    <>
                        {/* Backdrop for switching focus */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowSaved(false)}
                            className="absolute inset-0 bg-black/20 dark:bg-black/50 z-30 backdrop-blur-[1px]"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute inset-y-0 right-0 w-[350px] max-w-[85vw] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-40 flex flex-col"
                        >
                            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Saved Queries</h3>
                                <button onClick={() => setShowSaved(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
                                    <PanelRight size={18} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden relative">
                                <SavedQueries
                                    currentSql={sql}
                                    onLoadQuery={(val) => {
                                        setSql(val);
                                        editorRef.current?.setValue(val);
                                        setShowSaved(false);
                                    }}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
