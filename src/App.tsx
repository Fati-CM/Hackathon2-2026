import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SignalDetailPage } from './pages/SignalDetailPage'
import { SignalsPage } from './pages/SignalsPage'
import { SectorsPage } from './pages/SectorsPage'
import { StoryPage } from './pages/StoryPage'
import { TropelsPage } from './pages/TropelsPage'

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tropels" element={<TropelsPage />} />
          <Route path="/signals" element={<SignalsPage />} />
          <Route path="/signals/:id" element={<SignalDetailPage />} />
          <Route path="/sectors" element={<SectorsPage />} />
          <Route path="/sectors/:id/story" element={<StoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
