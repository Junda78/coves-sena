import { Outlet, useNavigate } from 'react-router-dom';
import { Calendar, ClipboardCheck, LogOut } from 'lucide-react';
import { authService } from '../services/auth.service';
import { toast } from 'sonner';

// ✅ Eliminamos la prop 'children' porque usamos <Outlet />
export default function DriverLayout() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();

    const handleLogout = () => {
        if (!window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
            return;
        }

        authService.logout();
        navigate('/login', { replace: true });
        toast.info('Sesión cerrada correctamente');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header superior */}
            <header className="bg-sena-green text-white shadow-md px-4 py-3 flex items-center justify-between sticky top-0 z-10">
                <div>
                    <h1 className="text-lg font-bold">Pool Vehicular SENA</h1>
                    <p className="text-xs opacity-90">Hola, {user?.fullName}</p>
                </div>
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <LogOut size={20} />
                </button>
            </header>

            {/* Contenido principal (Outlet renderiza las rutas hijas) */}
            <main className="flex-1 p-4 pb-24 overflow-y-auto">
                <Outlet />
            </main>

            {/* Navegación inferior fija (estilo app móvil) */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
                <div className="flex justify-around">
                    <button
                        onClick={() => navigate('/driver/agenda')}
                        className="flex-1 flex flex-col items-center py-3 text-gray-600 hover:text-sena-green active:text-sena-green transition-colors"
                    >
                        <Calendar size={24} />
                        <span className="text-xs mt-1 font-medium">Mi Agenda</span>
                    </button>
                    <button
                        onClick={() => navigate('/driver/checklist')}
                        className="flex-1 flex flex-col items-center py-3 text-gray-600 hover:text-sena-green active:text-sena-green transition-colors"
                    >
                        <ClipboardCheck size={24} />
                        <span className="text-xs mt-1 font-medium">Pre-marcha</span>
                    </button>
                </div>
            </nav>
        </div>
    );
}