import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { OverviewPage } from '@/pages/OverviewPage'
import { AnalyzePage } from '@/pages/AnalyzePage'
import { BatchPage } from '@/pages/BatchPage'
import { EvaluationPage } from '@/pages/EvaluationPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/batch" element={<BatchPage />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

