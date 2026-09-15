import { useEffect, useState } from 'react';
import { agendaService } from '../services/agenda.service';
import { vehiclesService } from '../services/vehicles.service';
import { driversService } from '../services/drivers.service';
import { formatColombiaDate } from '../utils/dateFormatter';
import api from '../services/api';
import { toast } from 'sonner';
import {
  Plus, Edit, Trash2, Search, Loader2, Calendar, Clock, MapPin, FileDown, ChevronLeft, ChevronRight
} from 'lucide-react';

interface AgendaService {
  id: number;
  serviceDate: string;
  startTime: string;
  endTime: string | null;
  vehicleId: number;
  driverId: number;
  activityType: string;
  title: string;
  destination: string | null;
  kmStart: number | null;
  requester: string | null;
  status: string;
  weekNumber?: number;
  year?: number;
  vehicle?: { plate: string; brand: string; model: string };
  driver?: { fullName: string; document: string };
}

interface Vehicle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  status: string;
}

interface Driver {
  id: number;
  fullName: string;
  document: string;
  active: boolean;
}

export default function Agenda() {
  const [services, setServices] = useState<AgendaService[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal de Programar/Editar
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<AgendaService | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de Exportar Reporte
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportVehicleId, setExportVehicleId] = useState<number>(0);
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    serviceDate: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    endTime: '12:00',
    vehicleId: 0,
    driverId: 0,
    activityType: 'EXTERNA',
    title: '',
    destination: '',
    kmStart: 0,
    requester: '',
    status: 'PROGRAMADO',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [servicesData, vehiclesData, driversData] = await Promise.all([
        agendaService.getAll(),
        vehiclesService.getAll(),
        driversService.getAll(),
      ]);
      setServices(servicesData);
      setVehicles(vehiclesData.filter((v: any) => v.status === 'OPERATIVO'));
      setDrivers(driversData.filter((d: any) => d.active));
    } catch (error) {
      toast.error('Error al cargar los datos de la agenda');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (service?: AgendaService) => {
    if (service) {
      setEditingService(service);
      setFormData({
        serviceDate: service.serviceDate.split('T')[0],
        startTime: service.startTime,
        endTime: service.endTime || '12:00',
        vehicleId: service.vehicleId,
        driverId: service.driverId,
        activityType: service.activityType,
        title: service.title,
        destination: service.destination || '',
        kmStart: service.kmStart || 0,
        requester: service.requester || '',
        status: service.status,
      });
    } else {
      setEditingService(null);
      const today = new Date();
      const bogotaDate = new Date(today.toLocaleString('en-US', { timeZone: 'America/Bogota' }));

      setFormData({
        serviceDate: bogotaDate.toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '12:00',
        vehicleId: 0,
        driverId: 0,
        activityType: 'EXTERNA',
        title: '',
        destination: '',
        kmStart: 0,
        requester: '',
        status: 'PROGRAMADO',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const date = new Date(formData.serviceDate);
      const weekNumber = getWeekNumber(date);
      const year = date.getFullYear();

      const payload = { ...formData, weekNumber, year };

      if (editingService) {
        await agendaService.update(editingService.id, payload);
        toast.success('Servicio actualizado correctamente');
      } else {
        await agendaService.create(payload);
        toast.success('Servicio programado correctamente');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el servicio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de cancelar/eliminar este servicio?')) return;
    try {
      await agendaService.delete(id);
      toast.success('Servicio eliminado correctamente');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar el servicio');
    }
  };

  const handleExportReport = async () => {
    if (exportVehicleId === 0) {
      toast.error('Seleccione un vehículo');
      return;
    }

    try {
      const response = await api.get(`/agenda/export/monthly?vehicleId=${exportVehicleId}&month=${exportMonth}&year=${exportYear}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GIL-F-034_Vehiculo_${exportVehicleId}_${exportMonth}_${exportYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Reporte GIL-F-034 descargado correctamente');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al generar el reporte');
    }
  };

  // ✅ 1. Filtrar servicios
  const filteredServices = services.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.vehicle?.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.driver?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ 2. Ordenar de más reciente a más antiguo
  const sortedServices = [...filteredServices].sort((a, b) => {
    return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
  });

  // ✅ 3. Calcular paginación
  const totalPages = Math.ceil(sortedServices.length / itemsPerPage);
  const paginatedServices = sortedServices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ✅ Resetear a página 1 cuando cambia la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
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

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'EXTERNA': return 'bg-purple-100 text-purple-800';
      case 'INTERNA': return 'bg-indigo-100 text-indigo-800';
      case 'MANTENIMIENTO': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sena-green" />
        <p>Cargando agenda...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Agenda Semanal</h1>
          <p className="text-gray-600 mt-1">Programación de servicios y asignación de flota (GIL-F-034)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowExportModal(true)} className="btn-secondary flex items-center gap-2 shadow-sm">
            <FileDown size={20} />
            Descargar Reporte
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2 shadow-sm">
            <Plus size={20} />
            Programar Servicio
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="card">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por descripción, placa o conductor..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="input-field flex-1 border-0 focus:ring-0 px-0"
          />
        </div>
      </div>

      {/* Tabla de Servicios */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Fecha y Hora</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Vehículo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Conductor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Descripción / Destino</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Solicitante</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedServices.length > 0 ? (
                paginatedServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={16} className="text-sena-green" />
                        <div>
                          <div className="font-semibold">{formatColombiaDate(service.serviceDate)}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock size={12} /> {service.startTime} - {service.endTime}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{service.vehicle?.plate || 'N/A'}</td>
                    <td className="px-6 py-4 text-gray-700">{service.driver?.fullName || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getActivityColor(service.activityType)}`}>
                          {service.activityType}
                        </span>
                        <div className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin size={14} /> {service.title} {service.destination ? `- ${service.destination}` : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{service.requester || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(service.status)}`}>
                        {service.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(service)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(service.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron servicios.' : 'No hay servicios programados aún.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ✅ Controles de Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{paginatedServices.length}</span> de{' '}
              <span className="font-semibold">{sortedServices.length}</span> servicios
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>

              {/* Números de página */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${currentPage === page
                    ? 'bg-sena-green text-white border-sena-green'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Programar/Editar Servicio */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingService ? 'Editar Servicio' : 'Programar Nuevo Servicio'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción de Actividad *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    required
                    placeholder="Ej: Visita técnica a CF Buga, Mantenimiento preventivo, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Actividad *</label>
                  <select value={formData.activityType} onChange={(e) => setFormData({ ...formData, activityType: e.target.value })} className="input-field" required>
                    <option value="EXTERNA">Externa</option>
                    <option value="INTERNA">Interna</option>
                    <option value="MANTENIMIENTO">Mantenimiento</option>
                    <option value="URGENCIA">Urgencia</option>
                    <option value="PERSONAL">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha *</label>
                  <input type="date" value={formData.serviceDate} onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })} className="input-field" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Inicio *</label>
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Fin</label>
                    <input type="time" value={formData.endTime || ''} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vehículo *</label>
                  <select value={formData.vehicleId} onChange={(e) => setFormData({ ...formData, vehicleId: Number(e.target.value) })} className="input-field" required>
                    <option value={0}>Seleccionar vehículo...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Conductor *</label>
                  <select value={formData.driverId} onChange={(e) => setFormData({ ...formData, driverId: Number(e.target.value) })} className="input-field" required>
                    <option value={0}>Seleccionar conductor...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.fullName} ({d.document})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Destino / Lugar</label>
                  <input type="text" value={formData.destination} onChange={(e) => setFormData({ ...formData, destination: e.target.value })} className="input-field" placeholder="Ej: Centro de Formación Salomía" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kilometraje Inicial</label>
                  <input
                    type="text"
                    value={formData.kmStart || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, kmStart: value ? Number(value) : 0 });
                    }}
                    className="input-field"
                    placeholder="Ej: 43000"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Solicitante</label>
                  <input type="text" value={formData.requester} onChange={(e) => setFormData({ ...formData, requester: e.target.value })} className="input-field" placeholder="Nombre de quien solicita" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input-field">
                    <option value="PROGRAMADO">Programado</option>
                    <option value="EN_CURSO">En Curso</option>
                    <option value="COMPLETADO">Completado</option>
                    <option value="CANCELADO">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingService ? 'Actualizar Servicio' : 'Programar Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exportar Reporte GIL-F-034 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Descargar Reporte GIL-F-034</h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Vehículo *</label>
                <select
                  value={exportVehicleId}
                  onChange={(e) => setExportVehicleId(Number(e.target.value))}
                  className="input-field"
                  required
                >
                  <option value={0}>Seleccionar vehículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mes *</label>
                <select
                  value={exportMonth}
                  onChange={(e) => setExportMonth(Number(e.target.value))}
                  className="input-field"
                >
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Año *</label>
                <input
                  type="number"
                  value={exportYear}
                  onChange={(e) => setExportYear(Number(e.target.value))}
                  className="input-field"
                  min={2020}
                  max={2100}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button type="button" onClick={() => setShowExportModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleExportReport} className="btn-primary flex items-center gap-2">
                <FileDown size={18} />
                Generar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Función auxiliar para obtener el número de semana
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}