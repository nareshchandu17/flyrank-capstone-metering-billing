import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FramerLayout from './components/FramerLayout';
import FramerLanding from './pages/FramerLanding';
import FramerDashboard from './pages/FramerDashboard';
import FramerTenants from './pages/FramerTenants';
import FramerUsage from './pages/FramerUsage';
import FramerHistory from './pages/FramerHistory';
import FramerSettings from './pages/FramerSettings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FramerLanding />} />
        <Route path="/dashboard" element={<FramerLayout />}>
          <Route index element={<FramerDashboard />} />
          <Route path="tenants" element={<FramerTenants />} />
          <Route path="usage" element={<FramerUsage />} />
          <Route path="history" element={<FramerHistory />} />
          <Route path="settings" element={<FramerSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
