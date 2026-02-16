import { useState, useEffect } from 'react';
import { Database, X, Check, AlertCircle, Save, Power } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

export const ConnectionManager = ({ isOpen, onClose, onConnectionChanged }) => {
    const [config, setConfig] = useState({
        type: 'postgres',
        host: 'localhost',
        port: '3307',
        database: 'test',
        username: 'postgres',
        password: ''
    });

    const [showPassword, setShowPassword] = useState(false);

    const [activeUri, setActiveUri] = useState(localStorage.getItem('db_connection_uri'));
    const [status, setStatus] = useState(null); // 'testing', 'success', 'error'
    const [msg, setMsg] = useState('');

    useEffect(() => {
        const savedConfig = localStorage.getItem('db_connection_config');
        if (savedConfig) {
            setConfig(JSON.parse(savedConfig));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
        setStatus(null);
    };

    const getUri = () => {
        const userEncoded = encodeURIComponent(config.username);
        const passEncoded = encodeURIComponent(config.password);
        const dbEncoded = encodeURIComponent(config.database);

        if (config.type === 'postgres') {
            return `postgresql://${userEncoded}:${passEncoded}@${config.host}:${config.port}/${dbEncoded}`;
        }
        if (config.type === 'mysql') {
            return `mysql+pymysql://${userEncoded}:${passEncoded}@${config.host}:${config.port}/${dbEncoded}`;
        }
        return '';
    };

    const handleTest = async () => {
        setStatus('testing');
        setMsg('Testing connection...');
        const uri = getUri();

        try {
            // Use the schema endpoint to test connection (lightweight)
            const res = await axios.post(`${API_BASE_URL}/schema`, {
                connection_uri: uri
            });

            if (res.data.error) {
                throw new Error(res.data.error);
            }

            setStatus('success');
            const successMsg = 'Connection successful!';
            setMsg(successMsg);
            toast.success(successMsg);
        } catch (err) {
            setStatus('error');
            const errorMsg = err.response?.data?.error || err.message || 'Connection failed';
            setMsg(errorMsg);
            toast.error(errorMsg);
        }
    };

    const handleSave = () => {
        const uri = getUri();
        localStorage.setItem('db_connection_uri', uri);
        localStorage.setItem('db_connection_config', JSON.stringify(config));
        setActiveUri(uri);

        // Dispatch CustomEvent with details
        const event = new CustomEvent('dbConnectionChanged', {
            detail: {
                uri,
                type: config.type,
                database: config.database,
                host: config.host
            }
        });
        window.dispatchEvent(event);

        onConnectionChanged?.(uri);
        toast.success(`Connected to ${config.database}`);
        onClose();
    };

    const handleDisconnect = () => {
        localStorage.removeItem('db_connection_uri');
        // We might keep the config for future convenience
        setActiveUri(null);

        const event = new CustomEvent('dbConnectionChanged', {
            detail: null // No active connection
        });
        window.dispatchEvent(event);

        onConnectionChanged?.(null);
        toast.success('Disconnected from database');
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                    <Database className="text-indigo-500" />
                                    Connect Database
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">

                                {activeUri ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <div>
                                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Active Connection</p>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 font-mono">{config.host}:{config.port}/{config.database}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDisconnect}
                                            className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                            Currently using <strong>Internal SQLite Sandbox</strong>. Connect an external database to query your own data.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Database Type</label>
                                    <select
                                        name="type"
                                        value={config.type}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="postgres">PostgreSQL</option>
                                        <option value="mysql">MySQL</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Host</label>
                                        <input
                                            type="text"
                                            name="host"
                                            value={config.host}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="localhost"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Port</label>
                                        <input
                                            type="text"
                                            name="port"
                                            value={config.port}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="5432"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Database Name</label>
                                    <input
                                        type="text"
                                        name="database"
                                        value={config.database}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="postgres"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={config.username}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                            placeholder="postgres"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={config.password}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all pr-10"
                                                placeholder="••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {status && (
                                    <div className={clsx(
                                        "p-4 rounded-xl text-sm font-medium flex items-center gap-3",
                                        status === 'error' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" :
                                            status === 'success' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                                    )}>
                                        {status === 'error' ? <AlertCircle size={20} /> :
                                            status === 'success' ? <Check size={20} /> :
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                                        <p>{msg}</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                                <button
                                    onClick={handleTest}
                                    disabled={status === 'testing'}
                                    className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    Test Connection
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={status === 'testing' || status === 'error'}
                                    className={clsx(
                                        "px-6 py-2 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center gap-2",
                                        status === 'success' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-500"
                                    )}
                                >
                                    <Save size={16} />
                                    Save & Connect
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
