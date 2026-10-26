import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import FramerLayout from './components/FramerLayout';
import FramerLanding from './pages/FramerLanding';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Usage from './pages/Usage';
import History from './pages/History';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<FramerLanding />} />
          <Route path="/dashboard" element={<FramerLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="usage" element={<Usage />} />
            <Route path="history" element={<History />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
