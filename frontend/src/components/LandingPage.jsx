import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useMotionTemplate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Database, Shield, Zap, Terminal, Sun, Moon, MessageSquare } from 'lucide-react';
import { useTheme } from './ThemeContext';

export const LandingPage = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: containerRef });
    const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

    const [terminalStep, setTerminalStep] = useState(0);
    const [typedText, setTypedText] = useState('');

    useEffect(() => {
        const steps = [
            { text: "$ datalk connect production_db", delay: 800, type: 'command' },
            { text: "✓ Connected securely.", delay: 400, type: 'success' },
            { text: "$ ask \"Generate monthly revenue report by region with year-over-year growth\"", delay: 1500, type: 'command' },
            { text: "Analyzing schema...", delay: 600, type: 'info' },
            { text: "SQL Query Generated:", delay: 2000, type: 'result' },
            { text: "$ ask \"Forecast revenue for next month\"", delay: 1000, type: 'command' },
            { text: "Running predictive model...", delay: 800, type: 'info' },
            { text: "Forecast Generated:", delay: 2000, type: 'result-2' }
        ];

        let currentTimeout;

        const runAnimation = async () => {
            while (true) {
                for (let i = 0; i < steps.length; i++) {
                    setTerminalStep(i);
                    if (steps[i].type === 'command') {
                        setTypedText('');
                        for (let char of steps[i].text) {
                            await new Promise(r => setTimeout(r, 50));
                            setTypedText(prev => prev + char);
                        }
                    }
                    await new Promise(r => setTimeout(r, steps[i].delay));
                }
                await new Promise(r => setTimeout(r, 4000)); // Pause at end
                setTerminalStep(0); // Reset for next loop
                setTypedText(''); // Clear text
                await new Promise(r => setTimeout(r, 500)); // Brief pause before restart
            }
        };

        runAnimation();

        return () => clearTimeout(currentTimeout);
    }, []);

    return (
        <div ref={containerRef} className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white font-sans overflow-x-hidden selection:bg-indigo-500/30 transition-colors duration-300">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-50 dark:from-black via-transparent to-transparent" />
            </div>

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-white">
                    <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
                        <img src="/logo.png" alt="Datalk Logo" className="w-full h-full object-cover" />
                    </div>
                    <span>Datalk</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                        title="Toggle Theme"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="px-3 md:px-5 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                        Login
                    </button>
                    <button
                        onClick={() => navigate('/register')}
                        className="px-3 md:px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
                    >
                        Get Started
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative z-10 pt-20 pb-32 px-6 text-center max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-8 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        v2.0 Now Available with Safe Mode
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-zinc-900 via-zinc-600 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-zinc-500 bg-clip-text text-transparent pb-2 drop-shadow-sm">
                        Talk to your database <br /> like a human.
                    </h1>
                    <motion.p
                        className="text-sm md:text-base max-w-2xl mx-auto mb-10 leading-relaxed tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-zinc-600 via-zinc-400 to-zinc-600 dark:from-zinc-400 dark:via-zinc-100 dark:to-zinc-400"
                        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        style={{ backgroundSize: "200% auto" }}
                    >
                        Stop wrestling with complex SQL queries. Just ask plain English questions and let Datalk analyze, visualize, and manage your data securely.
                    </motion.p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => navigate('/register')}
                            className="group relative px-8 py-4 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black rounded-full font-semibold text-lg transition-all hover:scale-105"
                        >
                            Start Querying Free
                            <ChevronRight className="inline-block ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </motion.div>

                {/* Hero Graphic / Terminal */}
                <motion.div
                    style={{ y }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                    className="mt-20 relative mx-auto max-w-4xl"
                >
                    <div className="rounded-xl bg-[#0d0d0d] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden aspect-video relative group font-mono">

                        <div className="absolute inset-x-0 top-0 h-8 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="p-8 pt-12 text-left font-mono text-sm md:text-base min-h-[300px]">
                            {/* Phase 1: Connection */}
                            {terminalStep >= 0 && terminalStep < 2 && (
                                <div className="text-zinc-500 mb-2">
                                    {terminalStep === 0 ? typedText : "$ ai-sql connect production_db"}
                                    {terminalStep === 0 && <span className="animate-pulse">_</span>}
                                </div>
                            )}

                            {terminalStep >= 1 && terminalStep < 2 && (
                                <div className="text-emerald-500 mb-4 animate-in fade-in slide-in-from-left-2 transition-all">
                                    ✓ Connected securely.
                                </div>
                            )}

                            {/* Phase 2: First Query */}
                            {terminalStep >= 2 && terminalStep < 5 && (
                                <div className="text-zinc-500 mb-2">
                                    {terminalStep === 2 ? typedText : "$ ask \"Generate monthly revenue report by region with year-over-year growth\""}
                                    {terminalStep === 2 && <span className="animate-pulse">_</span>}
                                </div>
                            )}

                            {terminalStep >= 3 && terminalStep < 5 && (
                                <div className="text-zinc-400 mb-2 animate-pulse">Analyzing schema relationships...</div>
                            )}

                            {terminalStep >= 4 && terminalStep < 5 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-zinc-100 font-mono text-xs leading-relaxed"
                                >
                                    <span className="text-purple-400">SELECT</span>
                                    <br />  DATE_TRUNC('month', order_date) <span className="text-purple-400">AS</span> month,
                                    <br />  region,
                                    <br />  <span className="text-purple-400">SUM</span>(amount) <span className="text-purple-400">AS</span> total_revenue,
                                    <br />  (<span className="text-purple-400">SUM</span>(amount) - <span className="text-purple-400">LAG</span>(<span className="text-purple-400">SUM</span>(amount)) <span className="text-purple-400">OVER</span> (...))
                                    <br /><span className="text-purple-400">FROM</span> sales <span className="text-purple-400">JOIN</span> regions <span className="text-purple-400">ON</span> sales.region_id = regions.id
                                    <br /><span className="text-purple-400">GROUP BY</span> 1, 2
                                    <br /><span className="text-purple-400">ORDER BY</span> 1 <span className="text-purple-400">DESC</span>;
                                </motion.div>
                            )}

                            {terminalStep >= 4 && terminalStep < 5 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="mt-6 p-4 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 flex items-center gap-4 mb-4"
                                >
                                    <div className="h-20 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md relative overflow-hidden flex items-end justify-between px-2 pb-2 border border-zinc-300 dark:border-zinc-700">
                                        {[40, 70, 50, 90, 60].map((height, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${height}%` }}
                                                transition={{ delay: 0.5 + (i * 0.1), duration: 0.5 }}
                                                className="w-4 bg-indigo-500 rounded-t-sm"
                                            />
                                        ))}
                                    </div>
                                    <div>
                                        <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                                        <div className="h-2 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Phase 3: Second Query */}
                            {terminalStep >= 5 && (
                                <div className="text-zinc-500 mb-2">
                                    {terminalStep === 5 ? typedText : "$ ask \"Forecast revenue for next month\""}
                                    {terminalStep === 5 && <span className="animate-pulse">_</span>}
                                </div>
                            )}

                            {terminalStep >= 6 && (
                                <div className="text-zinc-400 mb-2 animate-pulse">Running predictive model...</div>
                            )}

                            {terminalStep >= 7 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 p-4 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-800 flex items-center gap-4"
                                >
                                    <div className="h-20 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-md relative overflow-hidden flex items-end px-2 pb-2 border border-zinc-300 dark:border-zinc-700">
                                        {/* Line Chart Simulation */}
                                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                            <motion.path
                                                d="M0,50 C20,40 40,60 60,30 S80,10 100,5"
                                                fill="none"
                                                stroke="#10b981"
                                                strokeWidth="2"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: 1 }}
                                                transition={{ duration: 1.5, ease: "easeInOut" }}
                                            />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Growth Forecast</div>
                                            <div className="text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">+12%</div>
                                        </div>
                                        <div className="h-2 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-1" />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </header>

            {/* Features (Bento Grid) */}
            <section className="py-24 px-6 max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Database size={24} />}
                        title="Schema Aware"
                        desc="Reads your database structure automatically. No manual setup required."
                        delay={0.1}
                    />
                    <FeatureCard
                        icon={<Shield size={24} />}
                        title="Safe Mode v2"
                        desc="Prevents accidental deletions. Interactive confirmation for destructive queries."
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={<Zap size={24} />}
                        title="Instant Visualization"
                        desc="Auto-generates charts and graphs from your query results in milliseconds."
                        delay={0.3}
                    />
                </div>
            </section>

            <footer className="py-12 text-center text-zinc-900 dark:text-zinc-300 text-sm font-medium">
                <p>© 2026 Datalk. Built for humans. <span className="mx-2">•</span> Made by Sameer Jadhav</p>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        className="group relative p-8 rounded-3xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300 hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-zinc-900/50 hover:-translate-y-1"
    >
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="relative z-10">
            <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 shadow-sm group-hover:scale-110 transition-transform duration-300 text-zinc-900 dark:text-white">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-white group-hover:text-black dark:group-hover:text-zinc-100">
                {title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm">
                {desc}
            </p>
        </div>
    </motion.div>
);
