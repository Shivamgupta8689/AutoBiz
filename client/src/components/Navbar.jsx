import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/customers', label: 'Customers' },
  { to: '/invoices',  label: 'Invoices'  },
  { to: '/about',     label: 'About'     },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/dashboard" className="text-base md:text-lg font-bold text-indigo-600 shrink-0">
          Smart Invoicing
        </Link>

        {/* Nav links */}
        <div className="flex gap-0.5 overflow-x-auto">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition ${
                location.pathname === to
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="text-sm text-gray-600 font-medium">{user?.name}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs border border-gray-200 hover:border-red-300 hover:text-red-600 text-gray-500 font-medium px-3 py-1.5 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
