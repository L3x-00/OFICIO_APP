'use client';

import { useState, useEffect } from 'react';
import {
  X, Copy, CheckCircle2, User, Store,
  ImagePlus, Trash2, ChevronRight, ChevronDown,
  Clock, Truck, Star,
} from 'lucide-react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const MAX_PHOTOS = 3; // GRATIS plan limit
const MAX_SPECIALTIES = 3; // Especialidades (categorías hijas) por proveedor

const DAYS = [
  { key: 'lun', label: 'Lunes'     },
  { key: 'mar', label: 'Martes'    },
  { key: 'mie', label: 'Miércoles' },
  { key: 'jue', label: 'Jueves'    },
  { key: 'vie', label: 'Viernes'   },
  { key: 'sab', label: 'Sábado'    },
  { key: 'dom', label: 'Domingo'   },
];

const DEFAULT_SCHEDULE: Record<string, string> = {
  lun: '8:00-18:00', mar: '8:00-18:00', mie: '8:00-18:00',
  jue: '8:00-18:00', vie: '8:00-18:00', sab: '9:00-13:00', dom: 'Cerrado',
};

interface CategoryChild { id: number; name: string; }
interface Category      { id: number; name: string; forType: string | null; children: CategoryChild[]; }
interface Locality      { id: number; name: string; department: string; province?: string | null; district?: string | null; }

interface Props { onClose: () => void; onSuccess: () => void; }

export function CreateProviderModal({ onClose, onSuccess }: Props) {
  const [type, setType] = useState<'OFICIO' | 'NEGOCIO'>('OFICIO');

  const [email, setEmail]               = useState('');
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone]               = useState('');
  const [whatsapp, setWhatsapp]         = useState('');
  const [description, setDescription]   = useState('');
  const [address, setAddress]           = useState('');

  // OFICIO fields
  const [dni, setDni] = useState('');
  // NEGOCIO fields
  const [ruc, setRuc]                         = useState('');
  const [nombreComercial, setNombreComercial] = useState('');
  const [razonSocial, setRazonSocial]         = useState('');
  const [hasDelivery, setHasDelivery]         = useState(false);

  // Especialidades (multi-select, máx 3) + Sector expandido en el acordeón
  const [allCategories, setAllCategories]             = useState<Category[]>([]);
  const [selectedParentId, setSelectedParentId]       = useState<number | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [primaryCategoryId, setPrimaryCategoryId]     = useState<number | null>(null);

  // Schedule (NEGOCIO)
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedule, setSchedule]         = useState<Record<string, string>>(DEFAULT_SCHEDULE);

  // Locality
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [localityId, setLocalityId] = useState('');

  // Photos
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews]           = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied]           = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    fetch(`${BASE_URL}/admin/form-options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => {
        setAllCategories(d?.categories || []);
        setLocalities(d?.localities || []);
        if (d?.localities?.length) setLocalityId(d.localities[0].id.toString());
      })
      .catch(() => setError('Error al cargar opciones del formulario.'));
  }, []);

  const handleTypeChange = (t: 'OFICIO' | 'NEGOCIO') => {
    setType(t); setSelectedParentId(null);
    setSelectedCategoryIds([]); setPrimaryCategoryId(null);
  };

  const filteredParents = allCategories.filter((c) => c.forType === type);

  // Localidades ordenadas dept→prov→dist y con etiqueta jerárquica completa.
  // El catálogo guarda `name = district` solo, así que un dropdown plano de
  // distritos es ambiguo (hay nombres repetidos entre provincias). Mostrar
  // "Distrito — Provincia, Departamento" evita elegir el row equivocado.
  const localityLabel = (l: Locality) => {
    const head = l.district || l.name;
    const tail = [l.province, l.department].filter(Boolean).join(', ');
    return tail ? `${head} — ${tail}` : head;
  };
  const sortedLocalities = [...localities].sort((a, b) =>
    localityLabel(a).localeCompare(localityLabel(b), 'es'),
  );

  // Multi-especialidad: alterna selección, respeta el tope (MAX_SPECIALTIES)
  // y mantiene siempre una especialidad marcada como principal.
  const toggleCategory = (id: number) => {
    if (selectedCategoryIds.includes(id)) {
      const next = selectedCategoryIds.filter((x) => x !== id);
      setSelectedCategoryIds(next);
      if (primaryCategoryId === id) setPrimaryCategoryId(next[0] ?? null);
    } else {
      if (selectedCategoryIds.length >= MAX_SPECIALTIES) return;
      setSelectedCategoryIds([...selectedCategoryIds, id]);
      if (primaryCategoryId == null) setPrimaryCategoryId(id);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = [...selectedFiles, ...Array.from(e.target.files || [])].slice(0, MAX_PHOTOS);
    setSelectedFiles(newFiles);
    setPreviews(newFiles.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    const f = selectedFiles.filter((_, idx) => idx !== i);
    setSelectedFiles(f); setPreviews(f.map((x) => URL.createObjectURL(x)));
  };

  const handleSubmit = async () => {
    if (!email || !firstName || !businessName || !phone) { setError('Completa los campos obligatorios (*)'); return; }
    if (selectedCategoryIds.length === 0) { setError('Selecciona al menos una especialidad'); return; }
    setIsLoading(true); setError('');
    try {
      const token    = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('email',        email);
      formData.append('firstName',    firstName);
      formData.append('lastName',     lastName);
      formData.append('businessName', businessName);
      formData.append('phone',        phone);
      selectedCategoryIds.forEach((id) => formData.append('categoryIds', String(id)));
      if (primaryCategoryId != null) formData.append('primaryCategoryId', String(primaryCategoryId));
      formData.append('localityId',   localityId);
      formData.append('type',         type);
      if (whatsapp)    formData.append('whatsapp',    whatsapp);
      if (description) formData.append('description', description);
      if (address)     formData.append('address',     address);
      // Ubicación administrativa = la de la localidad elegida (única fuente de
      // verdad). Antes había campos de texto libre paralelos que iban al User
      // pero NO a la tarjeta (que muestra provider.locality) → el admin tipeaba
      // un distrito y la tarjeta mostraba el de la localidad por defecto. Ahora
      // dept/prov/dist se derivan del row seleccionado y quedan consistentes.
      const selectedLoc = localities.find((l) => String(l.id) === localityId);
      if (selectedLoc?.department) formData.append('department', selectedLoc.department);
      if (selectedLoc?.province)   formData.append('province',   selectedLoc.province);
      if (selectedLoc?.district)   formData.append('district',   selectedLoc.district);
      if (type === 'OFICIO' && dni)               formData.append('dni',             dni);
      if (type === 'NEGOCIO' && ruc)              formData.append('ruc',             ruc);
      if (type === 'NEGOCIO' && nombreComercial)  formData.append('nombreComercial', nombreComercial);
      if (type === 'NEGOCIO' && razonSocial)      formData.append('razonSocial',     razonSocial);
      if (type === 'NEGOCIO') {
        formData.append('hasDelivery',  String(hasDelivery));
        formData.append('scheduleJson', JSON.stringify(schedule));
      }
      selectedFiles.forEach((f) => formData.append('images', f));

      const res  = await fetch(`${BASE_URL}/admin/providers`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al crear');
      setTempPassword(data.tempPassword);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear');
    } finally {
      setIsLoading(false);
    }
  };

  if (tempPassword) {
    return (
      <ModalShell onClose={onClose}>
        <div className="py-10 text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto text-3xl border border-green-500/30">✨</div>
          <h3 className="text-white font-bold text-2xl">¡Registro Exitoso!</h3>
          <p className="text-gray-400 text-sm">Registrado con <span className="text-green-400 font-semibold">Plan Gratis</span>. Promover desde el listado de proveedores.</p>
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 max-w-sm mx-auto">
            <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-4">Contraseña Temporal</p>
            <div className="flex items-center justify-between bg-black/40 p-4 rounded-xl border border-white/5">
              <span className="text-white font-mono font-bold text-xl">{tempPassword}</span>
              <button onClick={() => { navigator.clipboard.writeText(tempPassword); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                {copied ? <CheckCircle2 size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
          <button onClick={() => { setTempPassword(''); onSuccess(); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all">
            Finalizar y cerrar
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-2xl text-sm text-center">{error}</div>}

      {/* Tipo */}
      <Section label="Tipo de Servicio">
        <div className="grid grid-cols-2 gap-4">
          {(['OFICIO', 'NEGOCIO'] as const).map((t) => (
            <button key={t} onClick={() => handleTypeChange(t)}
              className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${type === t ? (t === 'OFICIO' ? 'border-blue-500 bg-blue-500/10' : 'border-purple-500 bg-purple-500/10') : 'border-white/5 bg-white/5 hover:border-white/20'}`}
            >
              <div className={`p-3 rounded-xl ${type === t ? (t === 'OFICIO' ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white') : 'bg-white/5 text-gray-400'}`}>
                {t === 'OFICIO' ? <User size={22} /> : <Store size={22} />}
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">{t === 'OFICIO' ? 'Profesional' : 'Negocio'}</p>
                <p className="text-[10px] text-gray-500">{t === 'OFICIO' ? 'Independiente' : 'Local o establecimiento'}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Datos básicos */}
      <Section label="Datos de Acceso">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email *" value={email} onChange={setEmail} placeholder="correo@ejemplo.com" type="email" fullWidth />
          <Field label={type === 'NEGOCIO' ? 'Nombre Comercial *' : 'Nombre del Servicio *'} value={businessName} onChange={setBusinessName} placeholder={type === 'NEGOCIO' ? 'La Pollería del Chef' : 'Juan Electricista'} />
          <Field label="Nombre Titular *" value={firstName} onChange={setFirstName} placeholder="Juan" />
          <Field label="Apellido *"        value={lastName}  onChange={setLastName}  placeholder="Pérez" />
          <Field label="Teléfono *"        value={phone}     onChange={setPhone}     placeholder="+51 900 000 000" />
          <Field label="WhatsApp"          value={whatsapp}  onChange={setWhatsapp}  placeholder="+51 900 000 000" />
        </div>
      </Section>

      {/* Datos legales */}
      {type === 'OFICIO' ? (
        <Section label="Datos Profesional">
          <Field label="DNI (opcional)" value={dni} onChange={setDni} placeholder="12345678" />
        </Section>
      ) : (
        <Section label="Datos Negocio">
          <div className="grid grid-cols-2 gap-4">
            <Field label="RUC"             value={ruc}             onChange={setRuc}             placeholder="20123456789" />
            <Field label="Nombre Comercial" value={nombreComercial} onChange={setNombreComercial} placeholder="Pollería Chef" />
            <Field label="Razón Social"    value={razonSocial}     onChange={setRazonSocial}     placeholder="Empresa S.A.C." fullWidth />
          </div>
          <label className="flex items-center gap-3 cursor-pointer mt-3">
            <div onClick={() => setHasDelivery(!hasDelivery)}
              className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 cursor-pointer ${hasDelivery ? 'bg-green-500' : 'bg-white/10'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${hasDelivery ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm text-gray-300 flex items-center gap-2"><Truck size={14} /> Tiene servicio de delivery</span>
          </label>
        </Section>
      )}

      {/* Fotos */}
      <Section label={`Fotos del Servicio (máx ${MAX_PHOTOS} · Plan Gratis)`}>
        <div className="grid grid-cols-4 gap-3">
          {previews.map((url, i) => (
            <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10">
              <img src={url} className="w-full h-full object-cover" alt="" />
              <button onClick={() => removeFile(i)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
              {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-[9px] text-center text-white py-1 font-bold">PORTADA</div>}
            </div>
          ))}
          {selectedFiles.length < MAX_PHOTOS && (
            <label className="aspect-square rounded-2xl border-2 border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all text-gray-500 hover:text-blue-400">
              <ImagePlus size={22} />
              <span className="text-[10px] font-bold">Subir foto</span>
              <input type="file" hidden multiple accept="image/*" onChange={handleFileChange} />
            </label>
          )}
        </div>
      </Section>

      {/* Descripción y ubicación */}
      <Section label="Descripción y Ubicación">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
          placeholder={type === 'NEGOCIO' ? 'Especialidades, horarios, lo que hace único al negocio...' : 'Experiencia, especialidades, años en el oficio...'}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none mb-3"
        />
        <Field label="Dirección" value={address} onChange={setAddress} placeholder="Av. Principal 123" fullWidth />
        <p className="text-[11px] text-gray-500 mt-2">Distrito, provincia y departamento se toman de la <span className="text-gray-400">Localidad</span> seleccionada abajo.</p>
      </Section>

      {/* Especialidades — multi-select (máx 3) con marcado de principal */}
      <Section label={`${type === 'NEGOCIO' ? 'Tipo de Negocio' : 'Especialidades'} * — selecciona hasta ${MAX_SPECIALTIES}`}>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredParents.map((parent) => {
            const isOpen = selectedParentId === parent.id;
            const selInParent = parent.children.filter((c) => selectedCategoryIds.includes(c.id)).length;
            return (
              <div key={parent.id} className="rounded-2xl border border-white/10 overflow-hidden">
                <button type="button" onClick={() => setSelectedParentId(isOpen ? null : parent.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left ${isOpen ? (type === 'NEGOCIO' ? 'bg-purple-500/10 border-b border-purple-500/20' : 'bg-blue-500/10 border-b border-blue-500/20') : 'bg-white/5 hover:bg-white/10'}`}
                >
                  <span className={`font-semibold text-sm flex items-center gap-2 ${isOpen ? (type === 'NEGOCIO' ? 'text-purple-300' : 'text-blue-300') : 'text-white'}`}>
                    {parent.name}
                    {selInParent > 0 && <span className="text-[10px] bg-white/10 text-gray-300 px-1.5 py-0.5 rounded-full">{selInParent}</span>}
                  </span>
                  {isOpen ? <ChevronDown size={15} className={type === 'NEGOCIO' ? 'text-purple-400' : 'text-blue-400'} /> : <ChevronRight size={15} className="text-gray-500" />}
                </button>
                {isOpen && (
                  <div className="grid grid-cols-2 gap-2 p-3 bg-white/[0.02]">
                    {parent.children.map((child) => {
                      const sel = selectedCategoryIds.includes(child.id);
                      const capped = !sel && selectedCategoryIds.length >= MAX_SPECIALTIES;
                      return (
                        <button key={child.id} type="button" disabled={capped} onClick={() => toggleCategory(child.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border ${
                            sel ? (type === 'NEGOCIO' ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-blue-500/20 border-blue-500/40 text-blue-300')
                                : capped ? 'bg-white/[0.02] border-white/5 text-gray-600 cursor-not-allowed'
                                : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                          }`}
                        >{child.name}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Especialidades seleccionadas — la estrella marca la principal */}
        {selectedCategoryIds.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] text-gray-500">Toca la estrella para definir la especialidad principal:</p>
            <div className="flex flex-wrap gap-2">
              {selectedCategoryIds.map((id) => {
                const cat = allCategories.flatMap((p) => p.children).find((c) => c.id === id);
                const isPrimary = primaryCategoryId === id;
                return (
                  <div key={id} className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-xl text-xs border ${isPrimary ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' : 'bg-white/5 border-white/10 text-gray-300'}`}>
                    <button type="button" onClick={() => setPrimaryCategoryId(id)} title="Marcar como principal">
                      <Star size={13} className={isPrimary ? 'fill-amber-400 text-amber-400' : 'text-gray-500 hover:text-amber-400'} />
                    </button>
                    <span>{cat?.name ?? `#${id}`}</span>
                    <button type="button" onClick={() => toggleCategory(id)} title="Quitar">
                      <X size={12} className="text-gray-500 hover:text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* Localidad */}
      <Section label="Localidad">
        <select value={localityId} onChange={(e) => setLocalityId(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none appearance-none"
        >
          {sortedLocalities.map((l) => <option key={l.id} value={l.id} className="bg-[#1a1c1e]">{localityLabel(l)}</option>)}
        </select>
        <p className="text-[11px] text-gray-500 mt-2">Define el distrito/provincia que verá el cliente en la tarjeta del proveedor.</p>
      </Section>

      {/* Horario — solo NEGOCIO */}
      {type === 'NEGOCIO' && (
        <Section label="">
          <button type="button" onClick={() => setScheduleOpen(!scheduleOpen)}
            className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-white">
              <Clock size={16} className="text-purple-400" />
              Horario de Atención
              <span className="text-gray-500 text-xs font-normal">
                ({Object.values(schedule).filter((v) => v !== 'Cerrado').length} días activos)
              </span>
            </span>
            {scheduleOpen ? <ChevronDown size={15} className="text-purple-400" /> : <ChevronRight size={15} className="text-gray-500" />}
          </button>
          {scheduleOpen && (
            <div className="mt-2 space-y-2 p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
              {DAYS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                  <input value={schedule[key] ?? ''}
                    onChange={(e) => setSchedule({ ...schedule, [key]: e.target.value })}
                    placeholder="8:00-18:00 ó Cerrado"
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                  />
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Plan notice */}
      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-4 text-sm text-green-400 flex items-start gap-3">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Plan Gratis asignado automáticamente</p>
          <p className="text-green-500/60 text-xs mt-1">Promueve el plan desde la lista de proveedores una vez registrado.</p>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-4 pt-2">
        <button onClick={onClose} className="px-6 py-3 rounded-xl text-gray-400 hover:bg-white/5 font-bold transition-all">Cancelar</button>
        <button onClick={handleSubmit} disabled={isLoading}
          className={`text-white px-10 py-3 rounded-2xl text-sm font-bold disabled:opacity-50 shadow-lg transition-all transform active:scale-95 ${type === 'NEGOCIO' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}
        >
          {isLoading ? 'Procesando...' : 'Crear Proveedor'}
        </button>
      </div>
    </ModalShell>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[#121416] rounded-3xl border border-white/10 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between p-6 bg-white/5 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Registrar Proveedor</h2>
            <p className="text-xs text-gray-400">Plan Gratis · Promueve el plan después del registro</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-6 space-y-6">{children}</div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {label && <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>}
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', fullWidth = false }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; fullWidth?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'col-span-2' : ''}`}>
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}
