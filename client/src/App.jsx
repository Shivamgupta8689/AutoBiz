import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Invoices from './pages/Invoices';
import Reminders from './pages/Reminders';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import About from './pages/About';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/"         element={<Landing />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about"    element={<About />} />

        {/* Protected — all share the sidebar Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/invoices"  element={<Invoices />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/analytics"     element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings"      element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
