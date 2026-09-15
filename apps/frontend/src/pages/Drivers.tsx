import { useEffect, useState } from 'react';
import { driversService } from '../services/drivers.service';
import { formatColombiaDate } from '../utils/dateFormatter';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Loader2, UserCheck, UserX } from 'lucide-react';

// ✅ INTERFAZ CORREGIDA (sin errores de tipeo)
interface Driver {
  id: number;
  fullName: string;
  document: string;
  licenseNumber?: string | null;
  licenseCategory?: string | null;
  licenseExpiry?: string | null;
  phone?: string | null;
  active: boolean;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    document: '',
    licenseNumber: '',
    licenseCategory: '',
    licenseExpiry: '',
    phone: '',
    active: true,
  });

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await driversService.getAll();
      setDrivers(data as any); // ✅ Casting para evitar errores de tipos
    } catch (error) {
      toast.error('Error al cargar los conductores.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        fullName: driver.fullName,
        document: driver.document,
        licenseNumber: driver.licenseNumber || '',
        licenseCategory: driver.licenseCategory || '',
        licenseExpiry: driver.licenseExpiry ? driver.licenseExpiry.split('T')[0] : '',
        phone: driver.phone || '',
        active: driver.active,
      });
    } else {
      setEditingDriver(null);
      setFormData({
        fullName: '',
        document: '',
        licenseNumber: '',
        licenseCategory: '',
        licenseExpiry: '',
        phone: '',
        active: true,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingDriver) {
        await driversService.update(editingDriver.id, formData);
        toast.success('Conductor actualizado correctamente');
      } else {
        await driversService.create(formData);
        toast.success('Conductor creado correctamente');
      }
      setShowModal(false);
      loadDrivers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el conductor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este conductor?')) return;
    try {
      await driversService.delete(id);
      toast.success('Conductor eliminado correctamente');
      loadDrivers();
    } catch (error) {
      toast.error('Error al eliminar el conductor');
    }
  };

  const filteredDrivers = drivers.filter(d =>
    d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.document.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sena-green" />
        <p>Cargando conductores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Conductores</h1>
          <p className="text-gray-600 mt-1">Gestión del personal de conducción</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2 shadow-sm">
          <Plus size={20} />
          Nuevo Conductor
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field flex-1 border-0 focus:ring-0 px-0"
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Nombre Completo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Documento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Licencia</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Vencimiento</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-900">{driver.fullName}</td>
                    <td className="px-6 py-4 text-gray-600">{driver.document}</td>
                    <td className="px-6 py-4 text-gray-600">{driver.licenseNumber || '-'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
                        {driver.licenseCategory || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {driver.licenseExpiry ? formatColombiaDate(driver.licenseExpiry) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${driver.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {driver.active ? <UserCheck size={14} /> : <UserX size={14} />}
                        {driver.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(driver)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(driver.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron conductores.' : 'No hay conductores registrados aún.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingDriver ? 'Editar Conductor' : 'Registrar Nuevo Conductor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                  <input type="text" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="input-field" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Documento de Identidad *</label>
                  <input type="text" value={formData.document} onChange={(e) => setFormData({ ...formData, document: e.target.value })} className="input-field" required />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número de Licencia</label>
                  <input type="text" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} className="input-field" />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría de Licencia</label>
                  <select value={formData.licenseCategory} onChange={(e) => setFormData({ ...formData, licenseCategory: e.target.value })} className="input-field">
                    <option value="">Seleccionar...</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                    <option value="C3">C3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vencimiento de Licencia</label>
                  <input type="date" value={formData.licenseExpiry} onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })} className="input-field" />
                </div>

                <div className="flex items-center gap-3 mt-6">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-5 h-5 text-sena-green rounded focus:ring-sena-green"
                  />
                  <label htmlFor="active" className="text-sm font-semibold text-gray-700">Conductor Activo</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSubmitting}>Cancelar</button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingDriver ? 'Actualizar' : 'Crear'} Conductor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}