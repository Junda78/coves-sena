import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Agenda from './pages/Agenda';
import Checklists from './pages/Checklists';
import Fuel from './pages/Fuel';

// NUEVOS IMPORTS PARA CONDUCTORES
import DriverLayout from './components/DriverLayout';
import DriverAgenda from './pages/driver/DriverAgenda';
import DriverChecklist from './pages/driver/DriverChecklist';

// Componente para proteger rutas
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Verificar roles si se especifican
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

// ✅ CORREGIDO: Eliminamos la prop 'children' porque DriverLayout ya usa <Outlet /> internamente
const DriverRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Solo permitir acceso a conductores
  if (user.role !== 'DRIVER') {
    return <Navigate to="/" replace />;
  }

  return <DriverLayout />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Rutas de Admin */}
      <Route path="/" element={<ProtectedRoute roles={['ADMIN']}><Dashboard /></ProtectedRoute>} />
      <Route path="/vehicles" element={<ProtectedRoute roles={['ADMIN']}><Vehicles /></ProtectedRoute>} />
      <Route path="/drivers" element={<ProtectedRoute roles={['ADMIN']}><Drivers /></ProtectedRoute>} />
      <Route path="/agenda" element={<ProtectedRoute roles={['ADMIN']}><Agenda /></ProtectedRoute>} />
      <Route path="/checklists" element={<ProtectedRoute roles={['ADMIN']}><Checklists /></ProtectedRoute>} />
      <Route path="/fuel" element={<ProtectedRoute roles={['ADMIN']}><Fuel /></ProtectedRoute>} />

      {/* ✅ CORREGIDO: DriverRoute ya renderiza DriverLayout, no necesita pasar children */}
      <Route path="/driver" element={<DriverRoute />}>
        <Route index element={<Navigate to="/driver/agenda" replace />} />
        <Route path="agenda" element={<DriverAgenda />} />
        <Route path="checklist" element={<DriverChecklist />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}