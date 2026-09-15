import { useEffect, useState } from 'react';
import { vehiclesService } from '../services/vehicles.service';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';

// Interfaz local para evitar errores de importación
export interface Vehicle {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number | null; // Antes era 'number'
  fuelType: string;
  currentKm: number;
  chipCode: string | null;
  soatExpiry: string | null;
  tecnoExpiry: string | null;
  insuranceExpiry: string | null;
  status: string;
  createdAt: string;
}

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    fuelType: 'CORRIENTE',
    currentKm: 0,
    chipCode: '',
    soatExpiry: '',
    tecnoExpiry: '',
    insuranceExpiry: '',
    status: 'OPERATIVO',
  });

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const data = await vehiclesService.getAll();
      setVehicles(data);
    } catch (error) {
      toast.error('Error al cargar los vehículos. Verifica que el backend esté corriendo.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year ?? 0,
        fuelType: vehicle.fuelType,
        currentKm: vehicle.currentKm,
        chipCode: vehicle.chipCode || '',
        soatExpiry: vehicle.soatExpiry ? vehicle.soatExpiry.split('T')[0] : '',
        tecnoExpiry: vehicle.tecnoExpiry ? vehicle.tecnoExpiry.split('T')[0] : '',
        insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
        status: vehicle.status,
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        plate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        fuelType: 'CORRIENTE',
        currentKm: 0,
        chipCode: '',
        soatExpiry: '',
        tecnoExpiry: '',
        insuranceExpiry: '',
        status: 'OPERATIVO',
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingVehicle) {
        await vehiclesService.update(editingVehicle.id, formData);
        toast.success('Vehículo actualizado correctamente');
      } else {
        await vehiclesService.create(formData);
        toast.success('Vehículo creado correctamente');
      }
      setShowModal(false);
      loadVehicles();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el vehículo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este vehículo? Esta acción no se puede deshacer.')) return;

    try {
      await vehiclesService.delete(id);
      toast.success('Vehículo eliminado correctamente');
      loadVehicles();
    } catch (error) {
      toast.error('Error al eliminar el vehículo');
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIVO': return 'bg-green-100 text-green-800 border-green-200';
      case 'REVISAR': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TALLER': return 'bg-red-100 text-red-800 border-red-200';
      case 'INACTIVO': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFuelColor = (fuelType: string) => {
    switch (fuelType) {
      case 'ACPM': return 'bg-blue-100 text-blue-800';
      case 'CORRIENTE': return 'bg-green-100 text-green-800';
      case 'EXTRA': return 'bg-purple-100 text-purple-800';
      case 'GAS': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sena-green" />
        <p>Cargando vehículos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Vehículos</h1>
          <p className="text-gray-600 mt-1">Gestión de la flota vehicular del SENA</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          Nuevo Vehículo
        </button>
      </div>

      {/* Buscador */}
      <div className="card">
        <div className="flex items-center gap-3">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, marca o modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field flex-1 border-0 focus:ring-0 px-0"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Placa</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Marca / Modelo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Año</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Combustible</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kilometraje</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{vehicle.plate}</td>
                    <td className="px-6 py-4 text-gray-700">{vehicle.brand} {vehicle.model}</td>
                    <td className="px-6 py-4 text-gray-600">{vehicle.year}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${getFuelColor(vehicle.fuelType)}`}>
                        {vehicle.fuelType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">{vehicle.currentKm.toLocaleString()} km</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(vehicle.status)}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(vehicle)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm ? 'No se encontraron vehículos con ese criterio de búsqueda.' : 'No hay vehículos registrados aún.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingVehicle ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Placa *</label>
                  <input
                    type="text"
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                    className="input-field"
                    required
                    maxLength={6}
                    placeholder="ABC123"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Marca *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="input-field"
                    required
                    placeholder="Ej: Chevrolet"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Modelo *</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="input-field"
                    required
                    placeholder="Ej: Spark GT"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) || new Date().getFullYear() })}
                    className="input-field"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Combustible</label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="input-field"
                  >
                    <option value="CORRIENTE">Corriente</option>
                    <option value="EXTRA">Extra</option>
                    <option value="ACPM">ACPM (Diésel)</option>
                    <option value="GAS">Gas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Kilometraje Actual</label>
                  <input
                    type="number"
                    value={formData.currentKm}
                    onChange={(e) => setFormData({ ...formData, currentKm: parseInt(e.target.value) || 0 })}
                    className="input-field"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código Chip</label>
                  <input
                    type="text"
                    value={formData.chipCode}
                    onChange={(e) => setFormData({ ...formData, chipCode: e.target.value })}
                    className="input-field"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="OPERATIVO">Operativo</option>
                    <option value="REVISAR">Por Revisar</option>
                    <option value="TALLER">En Taller</option>
                    <option value="INACTIVO">Inactivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vencimiento SOAT</label>
                  <input
                    type="date"
                    value={formData.soatExpiry}
                    onChange={(e) => setFormData({ ...formData, soatExpiry: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vencimiento Tecnomecánica</label>
                  <input
                    type="date"
                    value={formData.tecnoExpiry}
                    onChange={(e) => setFormData({ ...formData, tecnoExpiry: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Vencimiento Seguro</label>
                  <input
                    type="date"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingVehicle ? 'Actualizar Vehículo' : 'Crear Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}