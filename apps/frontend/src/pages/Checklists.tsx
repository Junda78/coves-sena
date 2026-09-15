import { useEffect, useState, useMemo, useRef } from 'react';
import { checklistsService, DEFAULT_CHECKLIST_ITEMS } from '../services/checklists.service';
import { vehiclesService } from '../services/vehicles.service';
import { driversService } from '../services/drivers.service';
import { formatColombiaDate } from '../utils/dateFormatter'; // ✅ AGREGADO
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import { Trash2, Loader2, ClipboardCheck, AlertCircle, CheckCircle2, FileDown, Eye, PenLine, Eraser, Upload } from 'lucide-react';

interface ChecklistItem {
  category: string;
  itemName: string;
  status: 'SI' | 'NO' | 'NA';
  observation?: string;
}

interface Checklist {
  id: number;
  vehicleId: number;
  driverId: number;
  checklistDate: string;
  km: number;
  conformityScore: number;
  adminName: string;
  driverName: string;
  observations?: string;
  signature?: string;
  vehicle?: { plate: string; brand: string; model: string };
  driver?: { fullName: string };
  items?: ChecklistItem[];
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
  active: boolean;
}

export default function Checklists() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewChecklist, setPreviewChecklist] = useState<Checklist | null>(null);

  // Estados para la firma
  const sigCanvas = useRef<any>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    vehicleId: 0,
    driverId: 0,
    km: 0,
    adminName: '',
    driverName: '',
    observations: '',
    items: [] as ChecklistItem[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checklistsData, vehiclesData, driversData] = await Promise.all([
        checklistsService.getAll(),
        vehiclesService.getAll(),
        driversService.getAll(),
      ]);
      setChecklists(checklistsData);
      setVehicles(vehiclesData.filter((v: any) => v.status === 'OPERATIVO'));
      setDrivers(driversData.filter((d: any) => d.active));
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setFormData({
      vehicleId: 0,
      driverId: 0,
      km: 0,
      adminName: 'Ginna López',
      driverName: '',
      observations: '',
      items: DEFAULT_CHECKLIST_ITEMS.map(item => ({
        ...item,
        status: 'NA',
        observation: '',
      })),
    });
    // Limpiar estados de firma
    setSignatureData(null);
    setUploadedSignature(null);
    setSignatureMode('draw');
    setShowForm(true);
  };

  // Calcular puntaje de conformidad en tiempo real
  const conformityScore = useMemo(() => {
    const validItems = formData.items.filter(i => i.status !== 'NA');
    if (validItems.length === 0) return 0;
    const siCount = validItems.filter(i => i.status === 'SI').length;
    return Math.round((siCount / validItems.length) * 100);
  }, [formData.items]);

  const updateItemStatus = (index: number, status: 'SI' | 'NO' | 'NA') => {
    const newItems = [...formData.items];
    newItems[index].status = status;
    setFormData({ ...formData, items: newItems });
  };

  const updateItemObservation = (index: number, observation: string) => {
    const newItems = [...formData.items];
    newItems[index].observation = observation;
    setFormData({ ...formData, items: newItems });
  };

  // Funciones para manejar la firma
  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureData(null);
  };

  const saveSignature = () => {
    if (!sigCanvas.current?.isEmpty()) {
      setSignatureData(sigCanvas.current?.toDataURL());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.match('image/(png|jpg|jpeg)')) {
        toast.error('Solo se permiten imágenes PNG o JPG');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSignature(reader.result as string);
        setSignatureData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.vehicleId === 0 || formData.driverId === 0) {
      toast.error('Debe seleccionar un vehículo y un conductor');
      return;
    }

    if (!signatureData) {
      toast.error('Es obligatorio firmar el checklist');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        checklistDate: new Date().toISOString(),
        conformityScore,
        signature: signatureData, // ✅ Enviar firma al backend
      };
      await checklistsService.create(payload);
      toast.success('Chequeo pre-marcha registrado exitosamente');
      setShowForm(false);
      setSignatureData(null);
      setUploadedSignature(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el checklist');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este registro de chequeo?')) return;
    try {
      await checklistsService.delete(id);
      toast.success('Registro eliminado');
      loadData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleViewChecklist = (checklist: Checklist) => {
    setPreviewChecklist(checklist);
  };

  const handleDownloadGIL041 = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const url = `/api/checklists/${id}/export-gil-041`;
      console.log('📥 Intentando descargar desde:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      console.log('✅ Respuesta exitosa, descargando...');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `GIL-F-041_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success('Formato GIL-F-041 descargado exitosamente');
    } catch (error: any) {
      console.error('❌ Error final:', error);
      toast.error(error.message || 'Error al descargar');
    }
  };

  // Agrupar items por categoría para la vista
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, ChecklistItem[]> = {};
    formData.items.forEach(item => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return grouped;
  }, [formData.items]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sena-green" />
        <p>Cargando checklists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Chequeo Pre-Marcha</h1>
          <p className="text-gray-600 mt-1">Inspección vehicular diaria (GIL-F-035)</p>
        </div>
        <button onClick={handleOpenForm} className="btn-primary flex items-center gap-2 shadow-sm">
          <ClipboardCheck size={20} />
          Nuevo Chequeo
        </button>
      </div>

      {/* Lista de Checklists Realizados */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Vehículo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Conductor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Kilometraje</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Conformidad</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {checklists.length > 0 ? checklists.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  {/* ✅ CORREGIDO: Usar formatColombiaDate */}
                  <td className="px-6 py-4 text-sm">{formatColombiaDate(c.checklistDate)}</td>
                  <td className="px-6 py-4 font-semibold">{c.vehicle?.plate || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm">{c.driver?.fullName || c.driverName}</td>
                  <td className="px-6 py-4 text-sm font-mono">{c.km.toLocaleString()} km</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${c.conformityScore === 100 ? 'bg-green-500' : c.conformityScore >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${c.conformityScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold">{c.conformityScore}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleViewChecklist(c)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Vista previa del checklist"
                      >
                        <Eye size={18} />
                      </button>

                      <button
                        onClick={() => handleDownloadGIL041(c.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Descargar formato GIL-F-041"
                      >
                        <FileDown size={18} />
                      </button>

                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar checklist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No hay checklists registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Vista Previa del Checklist (Solo Lectura) */}
      {previewChecklist && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Vista Previa: Checklist {previewChecklist.vehicle?.plate}</h2>
                {/* ✅ CORREGIDO: Usar formatColombiaDate */}
                <p className="text-sm text-gray-500 mt-1">{formatColombiaDate(previewChecklist.checklistDate)}</p>
              </div>
              <button onClick={() => setPreviewChecklist(null)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg">
                <div>
                  <span className="text-xs text-gray-500">Fecha</span>
                  {/* ✅ CORREGIDO: Usar formatColombiaDate */}
                  <p className="font-semibold">{formatColombiaDate(previewChecklist.checklistDate)}</p>
                </div>
                <div><span className="text-xs text-gray-500">Vehículo</span><p className="font-semibold">{previewChecklist.vehicle?.plate}</p></div>
                <div><span className="text-xs text-gray-500">Conductor</span><p className="font-semibold">{previewChecklist.driverName}</p></div>
                <div><span className="text-xs text-gray-500">Kilometraje</span><p className="font-semibold">{previewChecklist.km} km</p></div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Elemento</th>
                      <th className="px-4 py-2 text-center w-24">Estado</th>
                      <th className="px-4 py-2 text-left">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewChecklist.items?.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{item.itemName}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${item.status === 'SI' ? 'bg-green-100 text-green-800' :
                            item.status === 'NO' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{item.observation || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewChecklist.signature && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Firma del Conductor:</p>
                  <img src={previewChecklist.signature} alt="Firma del conductor" className="max-w-xs border bg-white rounded" />
                </div>
              )}

              {previewChecklist.observations && (
                <div>
                  <h3 className="font-bold text-gray-800 mb-2">Observaciones Generales:</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{previewChecklist.observations}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario Modal de Nuevo Chequeo */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Nuevo Chequeo Pre-Marcha</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-sm text-gray-500">Puntaje de Conformidad:</span>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                    <div className={`w-3 h-3 rounded-full ${conformityScore === 100 ? 'bg-green-500' : conformityScore >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                    <span className="font-bold text-lg">{conformityScore}%</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <form id="checklist-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Vehículo *</label>
                    <select value={formData.vehicleId} onChange={(e) => setFormData({ ...formData, vehicleId: Number(e.target.value) })} className="input-field" required>
                      <option value={0}>Seleccionar...</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} - {v.brand}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conductor *</label>
                    <select value={formData.driverId} onChange={(e) => setFormData({ ...formData, driverId: Number(e.target.value) })} className="input-field" required>
                      <option value={0}>Seleccionar...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kilometraje Actual</label>
                    <input type="number" value={formData.km} onChange={(e) => setFormData({ ...formData, km: Number(e.target.value) })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Administrador</label>
                    <input type="text" value={formData.adminName} onChange={(e) => setFormData({ ...formData, adminName: e.target.value })} className="input-field" />
                  </div>
                </div>

                {Object.entries(itemsByCategory).map(([category, items]) => (
                  <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide">{category.replace('_', ' ')}</h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {items.map((item, idx) => {
                        const originalIndex = formData.items.findIndex(i => i.itemName === item.itemName && i.category === item.category);
                        return (
                          <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between p-3 hover:bg-gray-50 gap-3">
                            <span className="text-sm font-medium text-gray-800 flex-1">{item.itemName}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex bg-gray-100 rounded-lg p-1">
                                {(['SI', 'NO', 'NA'] as const).map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => updateItemStatus(originalIndex, status)}
                                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${formData.items[originalIndex].status === status
                                      ? status === 'SI' ? 'bg-green-500 text-white shadow'
                                        : status === 'NO' ? 'bg-red-500 text-white shadow'
                                          : 'bg-gray-400 text-white shadow'
                                      : 'text-gray-500 hover:bg-gray-200'
                                      }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                              <input
                                type="text"
                                placeholder="Observación (si aplica)"
                                value={formData.items[originalIndex].observation || ''}
                                onChange={(e) => updateItemObservation(originalIndex, e.target.value)}
                                className="input-field text-xs w-48"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* ✅ SECCIÓN DE FIRMA DEL CONDUCTOR */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <PenLine size={20} className="text-sena-green" />
                    Firma del Conductor *
                  </h3>

                  {/* Selector de modo */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setSignatureMode('draw')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${signatureMode === 'draw'
                        ? 'bg-sena-green text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <PenLine size={16} />
                      Dibujar Firma
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignatureMode('upload')}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${signatureMode === 'upload'
                        ? 'bg-sena-green text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      <Upload size={16} />
                      Subir Imagen
                    </button>
                  </div>

                  {/* Modo Dibujar */}
                  {signatureMode === 'draw' && (
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 relative">
                        <SignatureCanvas
                          ref={sigCanvas}
                          penColor="black"
                          canvasProps={{
                            className: 'w-full h-40 rounded-lg cursor-crosshair touch-none',
                            style: { background: 'white' }
                          }}
                          onEnd={saveSignature}
                        />
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                          title="Borrar firma"
                        >
                          <Eraser size={18} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Dibuja tu firma en el recuadro usando el dedo o un lápiz.</p>
                    </div>
                  )}

                  {/* Modo Subir Imagen */}
                  {signatureMode === 'upload' && (
                    <div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/png,image/jpg,image/jpeg"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="signature-upload"
                        />
                        <label htmlFor="signature-upload" className="cursor-pointer">
                          <Upload size={48} className="mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600 font-medium">Haz clic para subir tu firma</p>
                          <p className="text-xs text-gray-500 mt-1">Formatos: PNG, JPG (Máx. 5MB)</p>
                        </label>
                      </div>
                      {uploadedSignature && (
                        <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={20} className="text-green-600" />
                              <span className="text-sm font-medium text-green-800">Imagen cargada correctamente</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadedSignature(null);
                                setSignatureData(null);
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                            >
                              <Eraser size={18} />
                            </button>
                          </div>
                          <img src={uploadedSignature} alt="Firma subida" className="max-w-xs mt-3 border rounded bg-white" />
                        </div>
                      )}
                    </div>
                  )}

                  {!signatureData && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      <AlertCircle size={16} />
                      <span>La firma es obligatoria para completar el checklist</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Observaciones Generales</label>
                  <textarea
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="input-field h-24"
                    placeholder="Novedades generales del vehículo..."
                  ></textarea>
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" form="checklist-form" disabled={isSubmitting} className="btn-primary flex items-center gap-2">
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Chequeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}