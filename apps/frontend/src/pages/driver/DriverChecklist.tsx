import { useEffect, useState, useMemo, useRef } from 'react';
import { checklistsService, DEFAULT_CHECKLIST_ITEMS } from '../../services/checklists.service';
import { vehiclesService } from '../../services/vehicles.service';
import { toast } from 'sonner';
import { ClipboardCheck, Save, X, AlertCircle, CheckCircle2, PenLine, Eraser, Upload } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

interface ChecklistItem {
  category: string;
  itemName: string;
  status: 'SI' | 'NO' | 'NA';
  observation: string;
}

export default function DriverChecklist() {
  const [checklists, setChecklists] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checklistsData, vehiclesData] = await Promise.all([
        checklistsService.getAll(),
        vehiclesService.getAll(),
      ]);
      setChecklists(checklistsData);
      setVehicles(vehiclesData.filter((v: any) => v.status === 'OPERATIVO'));
    } catch (error) {
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = () => {
    setFormData({
      vehicleId: 0,
      driverId: user?.driverId || 0,
      km: 0,
      adminName: '',
      driverName: user?.fullName || '',
      observations: '',
      items: DEFAULT_CHECKLIST_ITEMS.map(item => ({
        ...item,
        status: 'NA',
        observation: '',
      })),
    });
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
      // Validar que sea imagen
      if (!file.type.match('image/(png|jpg|jpeg)')) {
        toast.error('Solo se permiten imágenes PNG o JPG');
        return;
      }

      // Validar tamaño (max 5MB)
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

  const removeUploadedSignature = () => {
    setUploadedSignature(null);
    setSignatureData(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.vehicleId === 0) {
      toast.error('Debe seleccionar un vehículo');
      return;
    }

    if (!signatureData) {
      toast.error('Es obligatorio firmar el checklist');
      return;
    }

    // ✅ VALIDACIÓN: Una firma base64 real debe tener al menos 1000 caracteres
    if (signatureData.length < 1000) {
      toast.error('La firma es demasiado pequeña. Por favor, dibújala de nuevo o sube una imagen clara.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        checklistDate: new Date().toISOString(),
        conformityScore,
        signature: signatureData,
      };

      console.log('📤 Enviando firma de longitud:', signatureData.length); // Debug

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
  // Agrupar items por categoría
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
        <div className="w-8 h-8 animate-spin border-4 border-sena-green border-t-transparent rounded-full mb-4" />
        <p>Cargando checklists...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Chequeo Pre-Marcha</h1>
          <p className="text-gray-600 text-sm mt-1">Inspección vehicular diaria (GIL-F-035)</p>
        </div>
        <button onClick={handleOpenForm} className="bg-sena-green text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm">
          <ClipboardCheck size={20} />
          Nuevo Chequeo
        </button>
      </div>

      {/* Lista de Checklists */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="space-y-4">
          {checklists.length > 0 ? checklists.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-lg">{c.vehicle?.plate || 'N/A'}</h3>
                  <p className="text-sm text-gray-600">{c.driver?.fullName || c.driverName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${c.conformityScore === 100 ? 'bg-green-100 text-green-800' :
                    c.conformityScore >= 80 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                    {c.conformityScore}% conformidad
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Fecha:</span>
                  {new Date(c.checklistDate).toLocaleDateString('es-CO')}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Kilometraje:</span>
                  {c.km.toLocaleString()} km
                </div>
              </div>

              {c.signature && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Firma del conductor:</p>
                  <img src={c.signature} alt="Firma" className="max-w-xs border rounded bg-white" />
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-12 text-gray-500">
              <ClipboardCheck className="mx-auto text-gray-300 mb-3" size={48} />
              <p>No tienes checklists registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* Formulario Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
            {/* Header */}
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

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              <form id="checklist-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Datos Generales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Vehículo *</label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({ ...formData, vehicleId: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none"
                      required
                    >
                      <option value={0}>Seleccionar...</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plate} - {v.brand}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Conductor</label>
                    <input
                      type="text"
                      value={formData.driverName}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Kilometraje Actual</label>
                    <input
                      type="number"
                      value={formData.km}
                      onChange={(e) => setFormData({ ...formData, km: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green outline-none"
                    />
                  </div>
                </div>

                {/* Items por Categoría */}
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
                                placeholder="Observación"
                                value={formData.items[originalIndex].observation || ''}
                                onChange={(e) => updateItemObservation(originalIndex, e.target.value)}
                                className="w-40 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-sena-green outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* FIRMA DEL CONDUCTOR */}
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
                              onClick={removeUploadedSignature}
                              className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                            >
                              <X size={18} />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sena-green outline-none h-24"
                    placeholder="Novedades generales del vehículo..."
                  ></textarea>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-end gap-3 sticky bottom-0">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="checklist-form" disabled={isSubmitting} className="px-4 py-2 bg-sena-green text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {isSubmitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <Save size={18} />
                Guardar Chequeo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}