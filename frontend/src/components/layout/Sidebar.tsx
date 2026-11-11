import { NavLink } from 'react-router-dom'
import { cn } from '@/utils'
import { useTheme } from '@/hooks/useTheme'
import {
  BarChart3,
  Camera,
  Layers,
  FlaskConical,
  History,
  Settings,
  Moon,
  Sun,
  Sparkles,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Overview', icon: BarChart3, end: true },
  { to: '/analyze', label: 'Analyze Screenshot', icon: Camera },
  { to: '/batch', label: 'Batch Analysis', icon: Layers },
  { to: '/evaluation', label: 'Evaluation Lab', icon: FlaskConical },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { dark, toggle } = useTheme()

  return (
    <aside className="w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 select-none">
      {/* Branding */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white text-sm tracking-wide">
              SENTIVISION
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Image-Based Sentiment Intelligence
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  )}
                />
                <span className="flex-1 truncate">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all"
        >
          <span className="flex items-center gap-2.5">
            {dark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </span>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            {dark ? 'Dark' : 'Light'}
          </span>
        </button>

        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 rounded-full bg-violet-600/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-xs">
            SV
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              Academic Lab
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              v1.0.0 · Localhost
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

