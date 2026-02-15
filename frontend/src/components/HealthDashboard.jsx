import { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Database, Server, HardDrive, Clock, ShieldCheck, Cpu } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { API_BASE_URL } from '../config';

export const HealthDashboard = ({ user, connectionUri }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const startTime = performance.now();
            // Pass user email and connection URI if available
            const params = {};
            if (user?.email) params.user_email = user.email;
            if (connectionUri) params.connection_uri = connectionUri;

            const res = await axios.get(`${API_BASE_URL}/health`, { params });
            const endTime = performance.now();

            setStats({
                ...res.data,
                latency: Math.round(endTime - startTime)
            });
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            console.error("Health check failed", err);
            setError("Backend seems to be offline or unreachable.");
            setStats(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user, connectionUri]); // Re-fetch if props change

    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
        <div className="h-full bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-300 p-6 md:p-12 overflow-y-auto transition-colors duration-300">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <Activity className="text-emerald-500" size={32} />
                            System Health
                        </h2>
                        <p className="text-zinc-500 mt-2">Real-time metrics and status of the SQL Agent infrastructure.</p>
                    </div>
                    <button
                        onClick={fetchHealth}
                        className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <Clock size={16} />
                        Refresh
                    </button>
                </div>

                {error ? (
                    <div className="p-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-4">
                        <Server size={32} />
                        <div>
                            <h3 className="font-bold text-lg">System Offline</h3>
                            <p>{error}</p>
                        </div>
                    </div>
                ) : loading && !stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Status Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatusCard
                                icon={Server}
                                label="Backend Status"
                                value="Online"
                                subtext="FastAPI Server"
                                color="emerald"
                            />
                            <StatusCard
                                icon={Database}
                                label="Database Size"
                                value={formatBytes(stats?.db_size_bytes || 0)}
                                subtext={stats?.system_db ? stats.system_db.split('\\').pop() : 'Unknown'}
                                color="indigo"
                            />
                            <StatusCard
                                icon={ShieldCheck}
                                label="Table Count"
                                value={stats?.table_count || 0}
                                subtext="Active Tables"
                                color="blue"
                            />
                            <StatusCard
                                icon={Cpu}
                                label="API Latency"
                                value={`${stats?.latency || 0}ms`}
                                subtext="Round Trip"
                                color="amber"
                            />
                        </div>

                        {/* Detailed Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                                    <HardDrive className="text-zinc-400" size={20} />
                                    Storage Information
                                </h3>
                                <div className="space-y-4">
                                    <InfoRow label="System DB Path" value={stats?.system_db || 'N/A'} isCode />
                                    <InfoRow label="DB File Size (Raw)" value={`${stats?.db_size_bytes?.toLocaleString()} bytes`} />
                                    <InfoRow label="Driver" value="SQLite3" />
                                    <InfoRow label="Last Checked" value={lastUpdated?.toLocaleTimeString()} />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                                    <Server className="text-zinc-400" size={20} />
                                    Server Information
                                </h3>
                                <div className="space-y-4">
                                    <InfoRow label="Status Message" value={stats?.message} />
                                    <InfoRow label="Host" value="localhost" />
                                    <InfoRow label="Port" value="8000" />
                                    <InfoRow label="Environment" value="Development" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusCard = ({ icon: Icon, label, value, subtext, color }) => {
    const colors = {
        emerald: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
        indigo: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20",
        blue: "text-blue-500 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20",
        amber: "text-amber-500 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20"
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow"
        >
            <div className={clsx("p-4 rounded-xl mb-4 border", colors[color])}>
                <Icon size={28} />
            </div>
            <span className="text-zinc-500 dark:text-zinc-500 text-sm font-medium uppercase tracking-wider mb-1">{label}</span>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-1">{value}</span>
            <span className="text-xs text-zinc-400 dark:text-zinc-600 font-mono">{subtext}</span>
        </motion.div>
    );
};

const InfoRow = ({ label, value, isCode }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
        <span className="text-zinc-500 dark:text-zinc-400 font-medium">{label}</span>
        {isCode ? (
            <code className="text-xs bg-zinc-100 dark:bg-zinc-950 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 break-all mt-1 sm:mt-0 max-w-full sm:max-w-[60%] text-right">{value}</code>
        ) : (
            <span className="text-zinc-900 dark:text-zinc-200 font-medium mt-1 sm:mt-0">{value}</span>
        )}
    </div>
);
