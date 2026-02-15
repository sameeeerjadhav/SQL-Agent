import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatInterface } from './components/ChatInterface';
import { Dashboard } from './components/Dashboard';
import { SqlEditor } from './components/SqlEditor';
import { SchemaViewer } from './components/SchemaViewer';
import { Settings } from './components/Settings';
import { HealthDashboard } from './components/HealthDashboard';
import { LogsViewer } from './components/LogsViewer';
import { API_BASE_URL } from './config';

export const Workspace = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chat');

    // Auth Check & User Info
    const [user, setUser] = useState({ email: null, name: 'Guest' });

    useEffect(() => {
        const token = localStorage.getItem('user_token');
        const userInfo = localStorage.getItem('user_info');
        if (!token) {
            navigate('/login');
        } else if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
    }, [navigate]);

    // --- Chat Session Management ---
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('chat_sessions');
        return saved ? JSON.parse(saved) : [{ id: 1, name: 'New Chat', timestamp: Date.now() }];
    });

    const [currentSessionId, setCurrentSessionId] = useState(() => {
        const saved = localStorage.getItem('current_session_id');
        return saved ? Number(saved) : 1;
    });

    // Save sessions and current ID
    useEffect(() => {
        localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        localStorage.setItem('current_session_id', currentSessionId);
    }, [currentSessionId]);

    // Load messages for current session
    const [messages, setMessages] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem(`chat_messages_${currentSessionId}`);
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            setMessages([{ role: 'assistant', content: 'Hello! I am your SQL Agent. Ask me anything about your database.' }]);
        }
    }, [currentSessionId]);

    // Save messages when they change
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`chat_messages_${currentSessionId}`, JSON.stringify(messages));
        }
    }, [messages, currentSessionId]);


    const handleNewChat = () => {
        const newId = Date.now();
        const newSession = { id: newId, name: 'New Chat', timestamp: Date.now() };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        // Messages will auto-reset due to useEffect on currentSessionId
    };

    const handleDeleteChat = (id) => {
        const newSessions = sessions.filter(s => s.id !== id);
        localStorage.removeItem(`chat_messages_${id}`);

        if (newSessions.length === 0) {
            // If deleting last session, create a fresh one
            const newId = Date.now();
            setSessions([{ id: newId, name: 'New Chat', timestamp: Date.now() }]);
            setCurrentSessionId(newId);
        } else {
            setSessions(newSessions);
            if (currentSessionId === id) {
                setCurrentSessionId(newSessions[0].id);
            }
        }
    };

    const handleRenameChat = (id, newName) => {
        setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    };

    const handleSelectChat = (id) => {
        setCurrentSessionId(id);
    };

    // Auto-rename chat based on first user message if prompt is short? 
    // Or maybe just let user rename. Let's keep it simple for now.

    const [queryHistory, setQueryHistory] = useState(() => {
        const saved = localStorage.getItem('query_history');
        return saved ? JSON.parse(saved) : [];
    });

    const [isLoading, setIsLoading] = useState(false);
    const [schema, setSchema] = useState([]);
    const [tableData, setTableData] = useState([]);
    const [connectionUri, setConnectionUri] = useState(localStorage.getItem('db_connection_uri'));

    useEffect(() => {
        const handleDbChange = () => {
            setConnectionUri(localStorage.getItem('db_connection_uri'));
        };
        window.addEventListener('dbConnectionChanged', handleDbChange);
        return () => window.removeEventListener('dbConnectionChanged', handleDbChange);
    }, []);

    // Re-fetch schema when connectionUri changes
    useEffect(() => {
        if (user.email) fetchSchema();
    }, [connectionUri]);

    const fetchSchema = async () => {
        if (!user.email) return;
        try {
            console.log("Fetching schema for:", user.email, connectionUri ? "(External DB)" : "(Local SQLite)");
            const res = await axios.post(`${API_BASE_URL}/schema`, {
                user_email: user.email,
                connection_uri: connectionUri
            });
            if (res.data.error) {
                console.error("Schema sync error:", res.data.error);
                setSchema([]);
            } else {
                setSchema(res.data.tables || []);
            }
        } catch (err) {
            console.error("Failed to fetch schema", err);
        }
    };

    useEffect(() => {
        if (user.email) {
            fetchSchema();
        }
    }, [user.email]);

    // NOTE: Old message persistence removed in favor of session-based persistence above

    useEffect(() => {
        localStorage.setItem('query_history', JSON.stringify(queryHistory));
    }, [queryHistory]);

    // Initial fetch handled by user email effect

    const handleSendMessage = async (text) => {
        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);

        // Auto-rename session on first message if it's "New Chat"
        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (currentSession && currentSession.name === 'New Chat') {
            const smartName = text.slice(0, 30) + (text.length > 30 ? '...' : '');
            handleRenameChat(currentSessionId, smartName);
        }

        setIsLoading(true);

        try {
            const history = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            console.log("Sending prompt:", text, "User:", user.email);
            const res = await axios.post(`${API_BASE_URL}/ask`, {
                prompt: text,
                history: history,
                safe_mode: localStorage.getItem('sql_safe_mode') === 'true',
                user_email: user.email,
                connection_uri: connectionUri
            });
            const aiResponse = res.data;

            if (aiResponse.status === 'success') {
                const botMsg = {
                    role: 'assistant',
                    content: aiResponse.thought || "Here is the result:",
                    datasets: aiResponse.datasets || [{
                        type: aiResponse.chart_type || 'table',
                        data: aiResponse.data,
                        sql: aiResponse.sql
                    }],
                    sql: aiResponse.sql,
                    requiresConfirmation: aiResponse.requires_confirmation
                };
                setMessages(prev => [...prev, botMsg]);

                if (!aiResponse.requires_confirmation) {
                    if (aiResponse.datasets && aiResponse.datasets.length > 0) {
                        aiResponse.datasets.forEach(ds => {
                            if (ds.sql) {
                                setQueryHistory(prev => [{
                                    id: Date.now() + Math.random(),
                                    sql: ds.sql,
                                    timestamp: new Date().toLocaleTimeString(),
                                    status: 'success'
                                }, ...prev]);
                            }
                        });
                    } else if (aiResponse.sql && aiResponse.sql !== 'N/A') {
                        const newHistoryItem = {
                            id: Date.now(),
                            sql: aiResponse.sql,
                            timestamp: new Date().toLocaleTimeString(),
                            status: 'success'
                        };
                        setQueryHistory(prev => [newHistoryItem, ...prev]);
                    }
                }

                if (text.toLowerCase().includes('create') || text.toLowerCase().includes('drop')) {
                    fetchSchema();
                }
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Error: ${aiResponse.error_message || 'Unknown error occurred'}`,
                    sql: aiResponse.sql
                }]);

                if (aiResponse.sql && aiResponse.sql !== 'N/A') {
                    setQueryHistory(prev => [{
                        id: Date.now(),
                        sql: aiResponse.sql,
                        timestamp: new Date().toLocaleTimeString(),
                        status: 'error',
                        error: aiResponse.error_message
                    }, ...prev]);
                }
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Network Error: Could not reach the backend."
            }]);
        }
        setIsLoading(false);
    };

    const [deleteCount, setDeleteCount] = useState(1);

    const handleDeleteLogs = () => {
        if (queryHistory.length === 0) return;
        const keepCount = Math.max(0, queryHistory.length - deleteCount);
        const newHistory = queryHistory.slice(0, keepCount);
        setQueryHistory(newHistory);
    };

    const [rowLimit, setRowLimit] = useState(() => Number(localStorage.getItem('sql_row_limit')) || 100);

    useEffect(() => {
        const handleSettingsChange = () => {
            setRowLimit(Number(localStorage.getItem('sql_row_limit')) || 100);
        };
        window.addEventListener('settingsChanged', handleSettingsChange);
        return () => window.removeEventListener('settingsChanged', handleSettingsChange);
    }, []);

    const handleConfirmSQL = async (sql, msgIndex) => {
        setMessages(prev => prev.map((msg, idx) =>
            idx === msgIndex ? { ...msg, isConfirmed: sql ? true : 'cancelled' } : msg
        ));

        if (!sql) return;

        setIsLoading(true);
        try {
            console.log("Executing SQL:", sql);
            const res = await axios.post(`${API_BASE_URL}/execute`, {
                sql: sql,
                user_email: user.email,
                connection_uri: connectionUri
            });

            if (res.data.status === 'success') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "✅ Execution confirmed. Here are the results:",
                    datasets: res.data.datasets,
                    sql: sql
                }]);
                fetchSchema();
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `❌ Execution Failed: ${res.data.error_message}`,
                    sql: sql
                }]);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "❌ Network Error during execution."
            }]);
        }
        setIsLoading(false);
    };

    return (
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
            {activeTab === 'chat' && (
                <ChatInterface
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    onConfirmSQL={handleConfirmSQL}
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    onNewChat={handleNewChat}
                    onSelectChat={handleSelectChat}
                    onDeleteChat={handleDeleteChat}
                    onRenameChat={handleRenameChat}
                />
            )}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'editor' && <SqlEditor />}
            {activeTab === 'schema' && (
                <div className="p-6">
                    <SchemaViewer
                        schema={schema}
                        tableData={tableData}
                        onRefresh={fetchSchema}
                        onFetchData={async (table) => {
                            try {
                                const limit = Number(localStorage.getItem('sql_row_limit')) || 100;
                                const res = await axios.post(`${API_BASE_URL}/execute`, {
                                    sql: `SELECT * FROM ${table} LIMIT ${limit}`,
                                    user_email: user.email,
                                    connection_uri: connectionUri
                                });
                                if (res.data.status === 'success' && res.data.datasets.length > 0) {
                                    setTableData(res.data.datasets[0].data);
                                }
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                        rowLimit={Number(localStorage.getItem('sql_row_limit')) || 100}
                    />
                </div>
            )}

            {activeTab === 'settings' && <Settings />}
            {activeTab === 'health' && <HealthDashboard user={user} connectionUri={connectionUri} />}

            {activeTab === 'logs' && (
                <div className="p-6 h-full flex flex-col gap-4 overflow-hidden">
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between shrink-0">
                        <div>
                            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Log Management</h3>
                            <p className="text-xs text-zinc-500">Manage your query history size.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <span className="text-xs text-zinc-500">Delete oldest</span>
                                <input
                                    type="number"
                                    min="1"
                                    max={queryHistory.length}
                                    value={deleteCount}
                                    onChange={(e) => setDeleteCount(Number(e.target.value))}
                                    className="w-12 bg-transparent text-sm font-medium text-center focus:outline-none"
                                />
                                <span className="text-xs text-zinc-500">rows</span>
                            </div>
                            <button
                                onClick={handleDeleteLogs}
                                disabled={queryHistory.length === 0}
                                className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 min-h-0">
                        <LogsViewer logs={queryHistory} />
                    </div>
                </div>
            )}
        </Layout>
    );
};
