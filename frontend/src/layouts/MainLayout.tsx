import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'

export function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
