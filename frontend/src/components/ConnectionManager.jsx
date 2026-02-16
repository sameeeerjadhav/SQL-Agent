import { useState, useEffect } from 'react';
import { Database, X, Check, AlertCircle, Save, Power, Server, Globe, Lock, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { API_BASE_URL } from '../config';
import toast from 'react-hot-toast';

export const ConnectionManager = ({ isOpen, onClose, onConnectionChanged }) => {
    const [config, setConfig] = useState({
        type: 'postgres',
        host: 'localhost',
        port: '5432',
        database: 'postgres',
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

    const InputField = ({ label, name, value, onChange, type = "text", placeholder, icon: Icon, className }) => (
        <div className={className}>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Icon size={16} className="text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                    placeholder={placeholder}
                />
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-zinc-900/60 backdrop-blur-md z-50 transition-all"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none p-4"
                    >
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                                        <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                                            <Database size={20} />
                                        </div>
                                        Connect Database
                                    </h2>
                                    <p className="text-xs text-zinc-500 mt-1 ml-11">Configure your external database connection</p>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">

                                {/* Connection Status Card */}
                                <div className={clsx(
                                    "rounded-xl p-4 border transition-colors relative overflow-hidden",
                                    activeUri
                                        ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                                        : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800"
                                )}>
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-full flex items-center justify-center",
                                                activeUri ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                            )}>
                                                {activeUri ? <Check size={20} /> : <Power size={20} />}
                                            </div>
                                            <div>
                                                <p className={clsx("text-sm font-bold", activeUri ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-700 dark:text-zinc-300")}>
                                                    {activeUri ? "Connected" : "Sandbox Mode"}
                                                </p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                                                    {activeUri ? `${config.host}:${config.port}/${config.database}` : "Using internal SQLite database"}
                                                </p>
                                            </div>
                                        </div>
                                        {activeUri && (
                                            <button
                                                onClick={handleDisconnect}
                                                className="px-3 py-1.5 bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
                                            >
                                                Disconnect
                                            </button>
                                        )}
                                    </div>
                                    {activeUri && (
                                        <div className="absolute -right-4 -bottom-4 opacity-10 text-emerald-500">
                                            <Database size={80} />
                                        </div>
                                    )}
                                </div>

                                {/* Form */}
                                <div className="space-y-4">
                                    {/* Web Deployment Warning */}
                                    {window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && (
                                        <div className="p-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 flex gap-3">
                                            <AlertCircle className="shrink-0 text-orange-600 dark:text-orange-400" size={20} />
                                            <div className="text-xs text-orange-800 dark:text-orange-200">
                                                <span className="font-bold block mb-1">Web Limitation</span>
                                                You are on the web version. You cannot connect to <code className="bg-orange-100 dark:bg-orange-500/30 px-1 rounded">localhost</code> databases. Please use a cloud database (e.g., Supabase, Neon) or run the app locally.
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Database Type</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['postgres', 'mysql'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => handleChange({ target: { name: 'type', value: type } })}
                                                    className={clsx(
                                                        "flex items-center justify-center gap-2 py-3 rounded-xl border transition-all text-sm font-medium",
                                                        config.type === type
                                                            ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500"
                                                            : "bg-white dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                                    )}
                                                >
                                                    {type === 'postgres' ? 'PostgreSQL' : 'MySQL'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <InputField
                                            label="Host"
                                            name="host"
                                            value={config.host}
                                            onChange={handleChange}
                                            placeholder="localhost"
                                            icon={Globe}
                                            className="col-span-2"
                                        />
                                        <InputField
                                            label="Port"
                                            name="port"
                                            value={config.port}
                                            onChange={handleChange}
                                            placeholder="5432"
                                            icon={Server}
                                        />
                                    </div>

                                    <InputField
                                        label="Database Name"
                                        name="database"
                                        value={config.database}
                                        onChange={handleChange}
                                        placeholder="postgres"
                                        icon={Database}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField
                                            label="Username"
                                            name="username"
                                            value={config.username}
                                            onChange={handleChange}
                                            placeholder="postgres"
                                            icon={UserIcon}
                                        />
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Password</label>
                                            <div className="relative group">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Lock size={16} className="text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
                                                </div>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    value={config.password}
                                                    onChange={handleChange}
                                                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                                                    placeholder="••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
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
                                </div>

                                {/* Status Message */}
                                {status && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={clsx(
                                            "p-4 rounded-xl text-sm font-medium flex items-center gap-3 border",
                                            status === 'error' ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 border-red-100 dark:border-red-500/20" :
                                                status === 'success' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20" :
                                                    "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20"
                                        )}>
                                        {status === 'error' ? <AlertCircle size={20} className="shrink-0" /> :
                                            status === 'success' ? <Check size={20} className="shrink-0" /> :
                                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
                                        <p>{msg}</p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
                                <button
                                    onClick={handleTest}
                                    disabled={status === 'testing'}
                                    className="px-6 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Test Connection
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={status === 'testing' || status === 'error'}
                                    className={clsx(
                                        "px-8 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
                                        status === 'success' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-500"
                                    )}
                                >
                                    <Save size={18} />
                                    {activeUri ? "Update Connection" : "Connect Database"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
