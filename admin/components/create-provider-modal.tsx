'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2, User, Store, ImagePlus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

const BASE_URL = 'http://localhost:3000';

interface CategoryChild {
  id: number;
  name: string;
  slug: string;
  forType: string | null;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  forType: string | null;
  children: CategoryChild[];
}

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

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Cascading category state for NEGOCIO
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${BASE_URL}/admin/form-options`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        setAllCategories(d?.categories || []);
        setLocalities(d?.localities || []);
        if (d?.localities?.length) setForm(f => ({ ...f, localityId: d.localities[0].id.toString() }));
      })
      .catch(() => setError('Error al cargar opciones del formulario.'));
  }, []);

  // Filter categories by current type
  const filteredParents = allCategories.filter(c => c.forType === form.type);
  const selectedParent = filteredParents.find(c => c.id === selectedParentId);
  const subcategories = selectedParent?.children ?? [];

  // Reset category selection when type changes
  const handleTypeChange = (newType: string) => {
    setForm(f => ({ ...f, type: newType, categoryId: '' }));
    setSelectedParentId(null);
  };

  const handleParentSelect = (parentId: number) => {
    setSelectedParentId(parentId === selectedParentId ? null : parentId);
    setForm(f => ({ ...f, categoryId: '' }));
  };

  const handleSubcategorySelect = (childId: number) => {
    setForm(f => ({ ...f, categoryId: childId.toString() }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...selectedFiles, ...files].slice(0, 4);
    setSelectedFiles(newFiles);
    setPreviews(newFiles.map(file => URL.createObjectURL(file)));
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
    if (!form.categoryId) {
      setError('Selecciona una categoría para el proveedor');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      selectedFiles.forEach(file => formData.append('images', file));

      const res = await fetch(`${BASE_URL}/admin/providers`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
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
            <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto text-3xl border border-green-500/30 shadow-[0_0_30px_-5px_rgba(34,197,94,0.3)]">✨</div>
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

              {/* TIPO DE PROVEEDOR */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Tipo de Servicio</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleTypeChange('OFICIO')}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${form.type === 'OFICIO' ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                  >
                    <div className={`p-3 rounded-xl ${form.type === 'OFICIO' ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}><User size={24}/></div>
                    <div className="text-left">
                      <p className="font-bold text-white text-sm">Oficio</p>
                      <p className="text-[10px] text-gray-500">Profesional independiente</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleTypeChange('NEGOCIO')}
                    className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${form.type === 'NEGOCIO' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                  >
                    <div className={`p-3 rounded-xl ${form.type === 'NEGOCIO' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-400'}`}><Store size={24}/></div>
                    <div className="text-left">
                      <p className="font-bold text-white text-sm">Negocio</p>
                      <p className="text-[10px] text-gray-500">Local o establecimiento</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* CAMPOS BÁSICOS */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Field label="Email *" value={form.email} onChange={(v: any) => setForm({ ...form, email: v })} placeholder="correo@ejemplo.com" type="email" />
                <Field label="Nombre Comercial *" value={form.businessName} onChange={(v: any) => setForm({ ...form, businessName: v })} placeholder={form.type === 'NEGOCIO' ? 'Ej: La Pollería del Chef' : 'Ej: Juan Electricista'} />
                <Field label="Nombre Titular *" value={form.firstName} onChange={(v: any) => setForm({ ...form, firstName: v })} placeholder="Juan" />
                <Field label="Apellido Titular *" value={form.lastName} onChange={(v: any) => setForm({ ...form, lastName: v })} placeholder="Pérez" />
                <Field label="Teléfono de Contacto *" value={form.phone} onChange={(v: any) => setForm({ ...form, phone: v })} placeholder="+51 900 000 000" />
                <Field label="WhatsApp (Opcional)" value={form.whatsapp} onChange={(v: any) => setForm({ ...form, whatsapp: v })} placeholder="+51 900 000 000" />
              </div>

              {/* GALERÍA — SOLO NEGOCIO */}
              {form.type === 'NEGOCIO' && (
                <div className="space-y-3 animate-in slide-in-from-top-4 duration-300">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Galería del Negocio (Máx 4)</label>
                  <div className="grid grid-cols-4 gap-4">
                    {previews.map((url, i) => (
                      <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        <img src={url} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                        {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-purple-600/80 text-[10px] text-center text-white py-1 font-bold">PORTADA</div>}
                      </div>
                    ))}
                    {selectedFiles.length < 4 && (
                      <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all text-gray-500 hover:text-purple-400">
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
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block ml-1">
                    {form.type === 'NEGOCIO' ? 'Descripción del Negocio' : 'Descripción del Servicio'}
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder={form.type === 'NEGOCIO'
                      ? 'Horarios, especialidades, lo que hace único a tu negocio...'
                      : 'Experiencia, especialidades, años en el oficio...'}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* CATEGORÍA — diferente para OFICIO vs NEGOCIO */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  {form.type === 'NEGOCIO' ? 'Tipo de Negocio *' : 'Categoría del Servicio *'}
                </label>

                {form.type === 'OFICIO' ? (
                  /* OFICIO: dropdown plano de subcategorías */
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider ml-1">Rubro</label>
                      <select
                        value={selectedParentId?.toString() ?? ''}
                        onChange={(e) => handleParentSelect(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none"
                      >
                        <option value="" className="bg-[#1a1c1e]">-- Selecciona un rubro --</option>
                        {filteredParents.map(p => (
                          <option key={p.id} value={p.id} className="bg-[#1a1c1e]">{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider ml-1">Especialidad</label>
                      <select
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                        disabled={!selectedParentId || subcategories.length === 0}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none disabled:opacity-40"
                      >
                        <option value="" className="bg-[#1a1c1e]">-- Selecciona especialidad --</option>
                        {subcategories.map(s => (
                          <option key={s.id} value={s.id} className="bg-[#1a1c1e]">{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  /* NEGOCIO: picker jerárquico con accordion visual */
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                    {filteredParents.map(parent => {
                      const isOpen = selectedParentId === parent.id;
                      return (
                        <div key={parent.id} className="rounded-2xl border border-white/10 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleParentSelect(parent.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isOpen ? 'bg-purple-500/10 border-b border-purple-500/20' : 'bg-white/5 hover:bg-white/10'}`}
                          >
                            <span className={`font-semibold text-sm ${isOpen ? 'text-purple-300' : 'text-white'}`}>{parent.name}</span>
                            {isOpen ? <ChevronDown size={16} className="text-purple-400" /> : <ChevronRight size={16} className="text-gray-500" />}
                          </button>
                          {isOpen && (
                            <div className="grid grid-cols-2 gap-2 p-3 bg-white/[0.02]">
                              {parent.children.map(child => {
                                const isSel = form.categoryId === child.id.toString();
                                return (
                                  <button
                                    key={child.id}
                                    type="button"
                                    onClick={() => handleSubcategorySelect(child.id)}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${isSel ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                  >
                                    {child.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Selección actual */}
                {form.categoryId && (
                  <p className="text-xs text-green-400 ml-1">
                    ✓ Seleccionado: {allCategories.flatMap(p => p.children).find(c => c.id.toString() === form.categoryId)?.name}
                  </p>
                )}
              </div>

              {/* LOCALIDAD */}
              <Select label="Localidad" value={form.localityId} onChange={(v: any) => setForm({ ...form, localityId: v })} options={localities} />

              {/* Botones */}
              <div className="flex justify-end gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-400 hover:bg-white/5 font-bold transition-all">Cancelar</button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className={`text-white px-10 py-3 rounded-2xl text-sm font-bold disabled:opacity-50 shadow-lg transition-all transform active:scale-95 ${form.type === 'NEGOCIO' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}
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
