'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, User, Store, ImagePlus, Trash2 } from 'lucide-react';

const BASE_URL = 'http://localhost:3000';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateProviderModal({ onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    email: '', firstName: '', lastName: '',
    businessName: '', phone: '', whatsapp: '',
    description: '', address: '',
    categoryId: '', localityId: '',
    type: 'OFICIO',
  });

  // --- ESTADOS PARA IMÁGENES ---
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [categories, setCategories] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${BASE_URL}/admin/form-options`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        setCategories(d?.categories || []);
        setLocalities(d?.localities || []);
        if (d?.categories?.length) setForm(f => ({ ...f, categoryId: d.categories[0].id.toString() }));
        if (d?.localities?.length) setForm(f => ({ ...f, localityId: d.localities[0].id.toString() }));
      })
      .catch(() => setError('Error al cargar opciones del formulario.'));
  }, []);

  // Manejador de fotos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...selectedFiles, ...files].slice(0, 4);
    setSelectedFiles(newFiles);
    
    // Generar previews
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const removeFile = (index: number) => {
    const filteredFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(filteredFiles);
    setPreviews(filteredFiles.map(file => URL.createObjectURL(file)));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.businessName || !form.phone) {
      setError('Completa los campos obligatorios (*)');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      
      // USAMOS FORMDATA EN LUGAR DE JSON
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      selectedFiles.forEach(file => formData.append('images', file));

      const res = await fetch(`${BASE_URL}/admin/providers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData, // El navegador pone el Content-Type correcto
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear');
      setTempPassword(data.tempPassword);
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#121416] rounded-3xl border border-white/10 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/5">
          <div>
            <h2 className="text-xl font-bold text-white">Registrar Proveedor</h2>
            <p className="text-xs text-gray-400">Completa la información para el nuevo perfil</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-8 custom-scrollbar">
          {tempPassword ? (
            /* VISTA DE ÉXITO (Mantenida pero estilizada) */
            <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
               <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto text-3xl border border-green-500/30 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]">
                ✨
              </div>
              <h3 className="text-white font-bold text-2xl">¡Registro Exitoso!</h3>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-sm mx-auto">
                <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-4">Acceso Temporal</p>
                <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
                  <span className="text-white font-mono font-bold text-xl">{tempPassword}</span>
                  <button onClick={handleCopy} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                    {copied ? <CheckCircle2 size={20} className="text-green-400"/> : <Copy size={20}/>}
                  </button>
                </div>
              </div>
              <button onClick={() => { setTempPassword(''); onSuccess(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20">
                Finalizar y cerrar
              </button>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm text-center">{error}</div>}

              {/* TIPO DE PROVEEDOR - CREATIVO */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tipo de Servicio</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setForm({ ...form, type: 'OFICIO' })}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${form.type === 'OFICIO' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                  >
                    <div className={`p-3 rounded-xl ${form.type === 'OFICIO' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}><User size={24}/></div>
                    <div className="text-left"><p className="font-bold text-white text-sm">Oficio</p><p className="text-[10px] text-gray-500">Profesional independiente</p></div>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'NEGOCIO' })}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${form.type === 'NEGOCIO' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                  >
                    <div className={`p-3 rounded-xl ${form.type === 'NEGOCIO' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}><Store size={24}/></div>
                    <div className="text-left"><p className="font-bold text-white text-sm">Negocio</p><p className="text-[10px] text-gray-500">Local o establecimiento</p></div>
                  </button>
                </div>
              </div>

              {/* GRID DE CAMPOS */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Email *" value={form.email} onChange={(v: any) => setForm({ ...form, email: v })} placeholder="correo@ejemplo.com" type="email" />
                <Field label="Nombre Comercial *" value={form.businessName} onChange={(v: any) => setForm({ ...form, businessName: v })} placeholder="Ej: Tech Solutions" />
                <Field label="Nombre Titular *" value={form.firstName} onChange={(v: any) => setForm({ ...form, firstName: v })} placeholder="Juan" />
                <Field label="Apellido Titular *" value={form.lastName} onChange={(v: any) => setForm({ ...form, lastName: v })} placeholder="Pérez" />
                <Field label="Teléfono de Contacto *" value={form.phone} onChange={(v: any) => setForm({ ...form, phone: v })} placeholder="+51 900 000 000" />
                <Field label="WhatsApp (Opcional)" value={form.whatsapp} onChange={(v: any) => setForm({ ...form, whatsapp: v })} placeholder="+51 900 000 000" />
              </div>

              {/* GALERÍA DE FOTOS - SOLO SI ES NEGOCIO */}
              {form.type === 'NEGOCIO' && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Galería del Negocio (Máx 4)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {previews.map((url, i) => (
                      <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        <img src={url} className="w-full h-full object-cover" />
                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                        {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-[10px] text-center text-white py-1 font-bold">PORTADA</div>}
                      </div>
                    ))}
                    {selectedFiles.length < 4 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all text-gray-500 hover:text-blue-400">
                        <ImagePlus size={24} />
                        <span className="text-[10px] font-bold">Subir foto</span>
                        <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Field label="Dirección Completa" value={form.address} onChange={(v: any) => setForm({ ...form, address: v })} placeholder="Av. Principal 123, Distrito" />
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Descripción del Servicio</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Select label="Categoría" value={form.categoryId} onChange={(v: any) => setForm({ ...form, categoryId: v })} options={categories} />
                <Select label="Localidad" value={form.localityId} onChange={(v: any) => setForm({ ...form, localityId: v })} options={localities} />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-400 hover:bg-white/5 font-bold transition-all">Cancelar</button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-2xl text-sm font-bold disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                >
                  {isLoading ? 'Procesando...' : 'Crear Proveedor'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// COMPONENTES ATÓMICOS PARA LIMPIEZA
function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
      >
        {options?.map((o: any) => <option key={o.id} value={o.id} className="bg-[#1a1c1e]">{o.name}</option>)}
      </select>
    </div>
  );
}