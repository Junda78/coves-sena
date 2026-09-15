import { useEffect, useState, useRef } from 'react';
import { fuelService } from '../services/fuel.service';
import api from '../services/api';
import { formatColombiaDate } from '../utils/dateFormatter';
import { toast } from 'sonner';
import { Upload, Trash2, Eye, Loader2, FileSpreadsheet, TrendingUp, FileDown } from 'lucide-react';

interface FuelUpload {
  id: number;
  originalFilename: string;
  month: number;
  year: number;
  recordsCount: number;
  totalGallons: number | null;
  totalValue: number | null;
  processedAt: string;
}

interface FuelLog {
  id: number;
  fuelDate: string;
  vehicle?: { plate: string };
  driverName: string | null; // Antes era 'string'
  station: string;
  product: string;
  gallons: number | null;
  totalValue: number | null;
  km?: number | null;
}

export default function Fuel() {
  const [uploads, setUploads] = useState<FuelUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<FuelUpload | null>(null);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
  });

  const [exportForm, setExportForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const data = await fuelService.getAllUploads();
      console.log('📦 Datos de uploads:', data); // Debug
      setUploads(data);
    } catch (error) {
      toast.error('Error al cargar el historial de combustible');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Debe seleccionar un archivo Excel');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);

      const response = await api.post('/fuel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;
      toast.success(result.message);
      setShowUploadModal(false);
      setUploadForm({ file: null });
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadUploads();
    } catch (error: any) {
      console.error('Error al subir archivo:', error);
      toast.error(error.response?.data?.message || 'Error al procesar el archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/fuel/export?month=${exportForm.month}&year=${exportForm.year}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GIL-F-066_Control_Combustible_${getMonthName(exportForm.month)}_${exportForm.year}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Reporte GIL-F-066 descargado correctamente');
      setShowExportModal(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al generar el reporte');
    }
  };

  const handleViewDetail = async (upload: FuelUpload) => {
    setSelectedUpload(upload);
    setShowDetailModal(true);
    setIsLoadingLogs(true);
    try {
      const logsData = await fuelService.getLogsByUpload(upload.id);
      console.log('📋 Logs:', logsData); // Debug
      setLogs(logsData);
    } catch (error) {
      toast.error('Error al cargar los registros');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar este upload y todos sus registros?')) return;
    try {
      await fuelService.deleteUpload(id);
      toast.success('Upload eliminado correctamente');
      loadUploads();
    } catch (error) {
      toast.error('Error al eliminar el upload');
    }
  };

  // ✅ FUNCIÓN SEGURA PARA NÚMEROS
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(value);
  };

  const getMonthName = (month: number) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return months[month - 1];
  };

  const getFuelColor = (product: string) => {
    switch (product) {
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
        <p>Cargando historial de combustible...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Combustible</h1>
          <p className="text-gray-600 mt-1">Control de abastecimiento y consumo</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowExportModal(true)} className="btn-secondary flex items-center gap-2 shadow-sm">
            <FileDown size={20} />
            Descargar Reporte
          </button>
          <button onClick={() => setShowUploadModal(true)} className="btn-primary flex items-center gap-2 shadow-sm">
            <Upload size={20} />
            Cargar Excel CGTS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-l-4 border-sena-green">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Total Uploads</h3>
              <p className="text-3xl font-bold mt-2">{uploads.length}</p>
            </div>
            <FileSpreadsheet className="text-sena-green" size={40} />
          </div>
        </div>
        <div className="card border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Galones Totales</h3>
              {/* ✅ CORREGIDO: Usar safeNumber */}
              <p className="text-3xl font-bold mt-2">
                {uploads.reduce((sum, u) => sum + safeNumber(u.totalGallons), 0).toFixed(1)}
              </p>
            </div>
            <TrendingUp className="text-blue-500" size={40} />
          </div>
        </div>
        <div className="card border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-500 text-sm">Valor Total</h3>
              {/* ✅ CORREGIDO: Usar safeNumber */}
              <p className="text-3xl font-bold mt-2">
                {formatCurrency(uploads.reduce((sum, u) => sum + safeNumber(u.totalValue), 0))}
              </p>
            </div>
            <TrendingUp className="text-yellow-500" size={40} />
          </div>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Archivo</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Mes / Año</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Registros</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Galones</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Valor Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Procesado</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {uploads.length > 0 ? uploads.map((upload) => (
                <tr key={upload.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={18} className="text-sena-green" />
                      <span className="font-semibold text-gray-900 text-sm">{upload.originalFilename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                      {getMonthName(upload.month)} {upload.year}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-gray-900">{upload.recordsCount}</td>
                  {/* ✅ CORREGIDO: Usar safeNumber */}
                  <td className="px-6 py-4 text-gray-700">{safeNumber(upload.totalGallons).toFixed(1)} gal</td>
                  {/* ✅ CORREGIDO: Usar safeNumber */}
                  <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(safeNumber(upload.totalValue))}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {formatColombiaDate(upload.processedAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleViewDetail(upload)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalle">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleDelete(upload.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No hay uploads de combustible registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Cargar Archivo Excel CGTS</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpload} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Archivo Excel</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="input-field"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    El sistema detectará automáticamente los meses y años desde las fechas del Excel
                  </p>
                </div>
                {uploadForm.file && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <FileSpreadsheet className="text-green-600" size={20} />
                    <span className="text-sm text-green-800 font-medium">{uploadForm.file.name}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary" disabled={isUploading}>Cancelar</button>
                <button type="submit" disabled={isUploading || !uploadForm.file} className="btn-primary flex items-center gap-2">
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isUploading ? 'Procesando...' : 'Subir Archivo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Descargar Reporte Mensual</h2>
              <button onClick={() => setShowExportModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Selecciona el mes y año para generar el formato oficial GIL-F-066.</p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mes</label>
                  <select
                    value={exportForm.month}
                    onChange={(e) => setExportForm({ ...exportForm, month: Number(e.target.value) })}
                    className="input-field"
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={exportForm.year}
                    onChange={(e) => setExportForm({ ...exportForm, year: Number(e.target.value) })}
                    className="input-field"
                    min={2020}
                    max={2100}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowExportModal(false)} className="btn-secondary">Cancelar</button>
                <button onClick={handleExport} className="btn-primary flex items-center gap-2">
                  <FileDown size={18} />
                  Generar y Descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 rounded-t-xl">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detalle de Registros</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedUpload.originalFilename} - {getMonthName(selectedUpload.month)} {selectedUpload.year}
                </p>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isLoadingLogs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-sena-green" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Placa</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Conductor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Estación</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Combustible</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Galones</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Valor</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">KM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{formatColombiaDate(log.fuelDate)}</td>
                          <td className="px-4 py-3 font-semibold text-sm">{log.vehicle?.plate || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm">{log.driverName || '-'}</td>
                          <td className="px-4 py-3 text-sm">{log.station}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getFuelColor(log.product)}`}>
                              {log.product}
                            </span>
                          </td>
                          {/* ✅ CORREGIDO: Usar safeNumber */}
                          <td className="px-4 py-3 text-sm font-mono">{safeNumber(log.gallons).toFixed(2)}</td>
                          {/* ✅ CORREGIDO: Usar safeNumber */}
                          <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(safeNumber(log.totalValue))}</td>
                          <td className="px-4 py-3 text-sm font-mono">{log.km?.toLocaleString() || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total de registros: <strong>{logs.length}</strong></span>
                <button onClick={() => setShowDetailModal(false)} className="btn-secondary">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}