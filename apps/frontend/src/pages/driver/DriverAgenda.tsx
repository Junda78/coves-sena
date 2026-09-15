import { useEffect, useState } from 'react';
import { agendaService } from '../../services/agenda.service';
import { Calendar, Clock, MapPin, Car } from 'lucide-react';

export default function DriverAgenda() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      // El backend ya filtra automáticamente por el conductor logueado
      const data = await agendaService.getAll();
      setServices(data);
    } catch (error) {
      console.error('Error cargando agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EN_CURSO': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'COMPLETADO': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELADO': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-gray-500">Cargando mi agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Mi Agenda</h1>
        <p className="text-gray-600 text-sm">Servicios asignados a ti</p>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
          <Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">No tienes servicios programados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{service.title}</h3>
                  {service.destination && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin size={14} className="text-sena-green" />
                      {service.destination}
                    </p>
                  )}
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(service.status)}`}>
                  {service.status.replace('_', ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                  <Calendar size={14} className="text-gray-400" />
                  {new Date(service.serviceDate).toLocaleDateString('es-CO')}
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded">
                  <Clock size={14} className="text-gray-400" />
                  {service.startTime} - {service.endTime || 'N/A'}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-sm">
                <Car size={16} className="text-sena-green" />
                <span className="font-semibold text-gray-700">{service.vehicle?.plate}</span>
                <span className="text-gray-500">- {service.vehicle?.brand} {service.vehicle?.model}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}