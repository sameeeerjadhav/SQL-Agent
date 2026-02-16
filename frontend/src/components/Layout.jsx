import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Database, Activity, Settings, Terminal, ChevronDown, Plus, Menu, X, ChevronRight, History, Sun, Moon, LayoutDashboard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useTheme } from './ThemeContext';
import { ConnectionManager } from './ConnectionManager';

const SidebarItem = ({ icon: Icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={clsx(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
      active
        ? "bg-indigo-50 dark:bg-zinc-800 text-indigo-700 dark:text-zinc-100 border border-indigo-100 dark:border-transparent"
        : "text-zinc-600 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
    )}
  >
    <Icon size={18} className={active ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-400"} />
    {!collapsed && (
      <span className="font-medium text-sm whitespace-nowrap">
        {label}
      </span>
    )}
    {active && !collapsed && (
      <ChevronRight size={14} className="ml-auto text-zinc-400 dark:text-zinc-600" />
    )}
  </button>
);

export const Layout = ({ children, activeTab, onTabChange, currentDbName }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      const saved = localStorage.getItem('user_info');
      return saved ? JSON.parse(saved) : { name: 'Guest User' };
    } catch (e) {
      return { name: 'Guest User' };
    }
  });

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'GU';
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('user_token');
      localStorage.removeItem('user_info');
      navigate('/');
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-black transition-colors duration-300">
      {/* ... (Mobile Sidebar Overlay remains same) ... */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        animate={{
          width: collapsed ? 72 : 260,
          x: mobileOpen ? 0 : 0
        }}
        className={clsx(
          "h-full border-r border-zinc-200 dark:border-zinc-800 flex flex-col z-50 fixed md:relative bg-white dark:bg-zinc-900/80 backdrop-blur-xl transition-all duration-300",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="p-5 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50">
          <AnimatePresence mode='wait'>
            {(!collapsed || mobileOpen) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center">
                  <img src="/logo.png" alt="Datalk" className="w-full h-full object-cover" />
                </div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  Datalk
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileOpen(false);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            {collapsed && !mobileOpen ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        <div className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-2 text-xs font-medium uppercase text-zinc-400 dark:text-zinc-700 tracking-wider">
            {(!collapsed || mobileOpen) ? "Workspace" : "..."}
          </div>
          <SidebarItem
            icon={MessageSquare}
            label="Query Chat"
            active={activeTab === 'chat'}
            onClick={() => { onTabChange('chat'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeTab === 'dashboard'}
            onClick={() => { onTabChange('dashboard'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
          <SidebarItem
            icon={Terminal}
            label="SQL Editor"
            active={activeTab === 'editor'}
            onClick={() => { onTabChange('editor'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
          <SidebarItem
            icon={Database}
            label="Schema"
            active={activeTab === 'schema'}
            onClick={() => { onTabChange('schema'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />

          <div className="my-1 border-t border-zinc-200/50 dark:border-zinc-800/50 mx-2" />

          <button
            onClick={() => setShowConnectionManager(true)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
              "text-zinc-600 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
            )}
            title="Connect External Database"
          >
            <Database size={18} className="text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            {(!collapsed || mobileOpen) && (
              <span className="font-medium text-sm whitespace-nowrap">Connect DB</span>
            )}
          </button>
          <SidebarItem
            icon={History}
            label="Logs"
            active={activeTab === 'logs'}
            onClick={() => { onTabChange('logs'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
          <div className="my-4 border-t border-zinc-200/50 dark:border-zinc-800/50" />
          <SidebarItem
            icon={Activity}
            label="Monitoring"
            active={activeTab === 'health'}
            onClick={() => { onTabChange('health'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
          <SidebarItem
            icon={Settings}
            label="Settings"
            active={activeTab === 'settings'}
            onClick={() => { onTabChange('settings'); setMobileOpen(false); }}
            collapsed={collapsed && !mobileOpen}
          />
        </div>

        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <div className={clsx(
            "rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3 flex items-center gap-3 group relative",
            (collapsed && !mobileOpen) ? "justify-center" : ""
          )}>
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              {getInitials(user.name)}
            </div>
            {(!collapsed || mobileOpen) && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">{user.name}</p>
                  <p className="text-xs text-zinc-500 truncate">Online</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Log Out"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
        {/* Minimal Header */}
        <header className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 z-10 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-200 truncate">
              {activeTab === 'chat' && 'AI Query Assistant'}
              {activeTab === 'dashboard' && 'Analytics Dashboard'}
              {activeTab === 'schema' && 'Database Explorer'}
              {activeTab === 'schema' && 'Database Explorer'}
              {activeTab === 'editor' && 'SQL Editor'}
              {activeTab === 'logs' && 'Operations Log'}
              {activeTab === 'settings' && 'System Configuration'}
              {activeTab === 'health' && 'System Health & Metrics'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            {/* DB Connection Status Badge */}
            <div className={clsx(
              "flex items-center gap-2 px-2 py-1 rounded-full border",
              currentDbName
                ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300"
                : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
            )}>
              <div className={clsx(
                "h-1.5 w-1.5 rounded-full",
                currentDbName ? "bg-indigo-500" : "bg-zinc-400"
              )} />
              <span className="text-[10px] font-medium tracking-wide hidden sm:inline uppercase">
                {currentDbName ? `DB: ${currentDbName}` : "SANDBOX"}
              </span>
            </div>

            <div className="flex items-center gap-2 px-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-500 tracking-wide hidden sm:inline">ONLINE</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </main>
      </div>
      <ConnectionManager
        isOpen={showConnectionManager}
        onClose={() => setShowConnectionManager(false)}

      />
    </div>
  );
};
