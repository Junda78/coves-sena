import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

import {
  LayoutDashboard,
  Car,
  Users,
  Calendar,
  ClipboardCheck,
  Fuel,
  LogOut,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/vehicles', label: 'Vehículos', icon: Car },
  { path: '/drivers', label: 'Conductores', icon: Users },
  { path: '/agenda', label: 'Agenda Semanal', icon: Calendar },
  { path: '/checklists', label: 'Chequeo Pre-Marcha', icon: ClipboardCheck },
  { path: '/fuel', label: 'Combustible', icon: Fuel },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleLogout = () => {
    if (!window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
      return;
    }

    authService.logout();
    navigate('/login', { replace: true });
    toast.info('Sesión cerrada correctamente');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-sena-green text-white flex flex-col">
        <div className="p-6 border-b border-green-700">
          <h1 className="text-xl font-bold">COVES SENA</h1>
          <p className="text-sm text-green-200 mt-1">Sistema de Control Vehicular SENA</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-white text-sena-green font-semibold'
                  : 'hover:bg-green-700'
                  }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-green-700">
          <div className="mb-3">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-green-200">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}