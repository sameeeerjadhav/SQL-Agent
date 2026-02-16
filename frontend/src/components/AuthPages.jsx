import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, MessageSquare } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthLayout = ({ children, title, subtitle }) => (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white flex items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-zinc-900/10 dark:selection:bg-white/20">
        {/* Background Effects */}
        <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-black via-transparent to-transparent" />
        </div>

        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full max-w-md relative z-10"
        >
            <div className="mb-8 text-center">
                <Link to="/" className="inline-flex items-center gap-2 font-bold text-2xl tracking-tight text-zinc-900 dark:text-white mb-6 hover:opacity-80 transition-opacity">
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-zinc-900/10 dark:shadow-white/10">
                        <img src="/logo.png" alt="Datalk" className="w-full h-full object-cover" />
                    </div>
                    <span>Datalk</span>
                </Link>
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-zinc-900 dark:text-white">{title}</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">{subtitle}</p>
            </div>

            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
                {children}
            </div>
        </motion.div>
    </div>
);

export const LoginPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://127.0.0.1:8000/auth/login', formData);
            if (res.data.status === 'success') {
                localStorage.setItem('user_token', res.data.token);
                localStorage.setItem('user_info', JSON.stringify(res.data.user));
                toast.success('Welcome back!');
                navigate('/workspace');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || 'Login failed';
            setError(msg);
            toast.error(msg);
        }
        setLoading(false);
    };

    return (
        <AuthLayout title="Welcome back" subtitle="Enter your credentials to access the workspace">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Email</label>
                    <input
                        type="email"
                        required
                        className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Password</label>
                    <input
                        type="password"
                        required
                        className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
                </button>
            </form>
            <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Don't have an account? <Link to="/register" className="font-semibold text-zinc-900 dark:text-white hover:underline">Sign up</Link>
            </div>
            <div className="mt-6 text-center">
                <Link to="/" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={12} /> Back to Home
                </Link>
            </div>
        </AuthLayout>
    );
};

export const RegisterPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post('http://127.0.0.1:8000/auth/register', formData);
            if (res.data.status === 'success') {
                toast.success('Account created successfully!');
                navigate('/login');
            }
        } catch (err) {
            const msg = err.response?.data?.detail || 'Registration failed';
            setError(msg);
            toast.error(msg);
        }
        setLoading(false);
    };

    return (
        <AuthLayout title="Create Account" subtitle="Get started with your AI SQL Assistant">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium">
                        {error}
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Full Name</label>
                    <input
                        type="text"
                        required
                        className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Email</label>
                    <input
                        type="email"
                        required
                        className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 ml-1">Password</label>
                    <input
                        type="password"
                        required
                        className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
                </button>
            </form>
            <div className="mt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
                Already have an account? <Link to="/login" className="font-semibold text-zinc-900 dark:text-white hover:underline">Sign in</Link>
            </div>
            <div className="mt-6 text-center">
                <Link to="/" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={12} /> Back to Home
                </Link>
            </div>
        </AuthLayout>
    );
};
