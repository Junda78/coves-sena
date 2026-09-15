import { useEffect, useState } from 'react';
import { vehiclesService } from '../services/vehicles.service';
import { agendaService } from '../services/agenda.service';
import { useNavigate } from 'react-router-dom';
import { Car, Calendar, AlertTriangle, Plus, Clock } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    operationalVehicles: 0,
    weeklyServices: 0,
    expiringSoon: 0,
  });
  const [expiringDetails, setExpiringDetails] = useState<any[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const vehicles = await vehiclesService.getAll();
      const operational = vehicles.filter((v: any) => v.status === 'OPERATIVO').length;

      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const services = await agendaService.getAll();
      const weeklyServices = services.filter((s: any) => {
        const serviceDate = new Date(s.serviceDate);
        return serviceDate >= weekStart && serviceDate <= weekEnd;
      }).length;

      const expiring = await vehiclesService.getExpiring();

      setStats({
        operationalVehicles: operational,
        weeklyServices,
        expiringSoon: expiring.length,
      });
      setExpiringDetails(expiring);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDaysColor = (days: number) => {
    if (days <= 7) return 'text-red-600';
    if (days <= 15) return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bienvenid@</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-l-4 border-sena-green">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Vehículos Operativos</h3>
              <p className="text-3xl font-bold mt-2">{stats.operationalVehicles}</p>
            </div>
            <Car className="text-sena-green" size={40} />
          </div>
        </div>

        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Servicios Esta Semana</h3>
              <p className="text-3xl font-bold mt-2">{stats.weeklyServices}</p>
            </div>
            <Calendar className="text-blue-500" size={40} />
          </div>
        </div>

        <div
          className="card border-l-4 border-yellow-500 relative cursor-pointer"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Vencimientos Próximos</h3>
              <p className="text-3xl font-bold mt-2">{stats.expiringSoon}</p>
            </div>
            <AlertTriangle className="text-yellow-500" size={40} />
          </div>

          {showTooltip && expiringDetails.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <Clock size={16} className="text-yellow-500" />
                <h4 className="font-bold text-gray-800 text-sm">Próximos Vencimientos</h4>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {expiringDetails.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-900">{item.plate}</div>
                      <div className="text-xs text-gray-600">{item.type}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${getDaysColor(item.daysLeft)}`}>
                        {item.daysLeft} días
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(item.expiryDate)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showTooltip && expiringDetails.length === 0 && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-4">
              <p className="text-sm text-gray-600 text-center">No hay vencimientos próximos</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button onClick={() => navigate('/vehicles')} className="card hover:shadow-lg transition-shadow text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Plus className="text-sena-green" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-sena-green">+ Nuevo Vehículo</h3>
                <p className="text-sm text-gray-600">Registrar vehículo</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/drivers')} className="card hover:shadow-lg transition-shadow text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Plus className="text-blue-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-blue-600">+ Nuevo Conductor</h3>
                <p className="text-sm text-gray-600">Registrar conductor</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/agenda')} className="card hover:shadow-lg transition-shadow text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Plus className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-purple-600">+ Programar Servicio</h3>
                <p className="text-sm text-gray-600">Agenda semanal</p>
              </div>
            </div>
          </button>

          <button onClick={() => navigate('/fuel')} className="card hover:shadow-lg transition-shadow text-left">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Plus className="text-orange-600" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-orange-600">+ Subir Combustible</h3>
                <p className="text-sm text-gray-600">Cargar Excel GIL-F-066</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}