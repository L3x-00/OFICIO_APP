'use client';

import { useState, useEffect } from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';

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
  const [categories, setCategories] = useState<any[]>([]);
  const [localities, setLocalities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // 1. Obtener el token del localStorage
    const token = localStorage.getItem('adminToken');

    fetch(`${BASE_URL}/admin/form-options`, {
      headers: {
        'Authorization': `Bearer ${token}` // <--- INDISPENSABLE para evitar el 401
      }
    })
      .then((r) => {
        if (!r.ok) throw new Error('Error al cargar opciones');
        return r.json();
      })
      .then((d) => {
        // 2. Validación defensiva para evitar el error de 'length' o 'map'
        const cats = d?.categories || [];
        const locs = d?.localities || [];

        setCategories(cats);
        setLocalities(locs);

        if (cats.length > 0)
          setForm((f) => ({ ...f, categoryId: cats[0].id.toString() }));
        if (locs.length > 0)
          setForm((f) => ({ ...f, localityId: locs[0].id.toString() }));
      })
      .catch(err => {
        console.error(err);
        setError('No se pudieron cargar las categorías. Sesión expirada?');
      });
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.businessName || !form.phone) {
      setError('Los campos marcados con * son obligatorios');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${BASE_URL}/admin/providers`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // <--- También aquí para crear el proveedor
        },
        body: JSON.stringify({
          ...form,
          categoryId: parseInt(form.categoryId),
          localityId: parseInt(form.localityId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error al crear el proveedor');
      }

      setTempPassword(data.tempPassword);
      
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1c1e] rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Nuevo proveedor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {tempPassword ? (
          /* VISTA DE ÉXITO */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✅
            </div>
            <div>
              <h3 className="text-white font-bold text-xl">¡Proveedor creado!</h3>
              <p className="text-gray-400 text-sm mt-1">Copia las credenciales de acceso:</p>
            </div>

            <div className="bg-bg-dark rounded-xl p-4 text-left border border-white/5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Email</p>
                <p className="text-white font-mono">{form.email}</p>
              </div>
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Contraseña Temporal</p>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-mono font-bold text-lg">{tempPassword}</span>
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-2 text-xs bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-1.5 rounded-lg transition-all border border-white/10"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-green-400"/> : <Copy size={14}/>}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setTempPassword('');
                onSuccess();
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold transition-all"
            >
              Listo, volver a la lista
            </button>
          </div>
        ) : (
          /* FORMULARIO DE CREACIÓN */
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Email *" value={form.email} onChange={(v: any) => setForm({ ...form, email: v })} placeholder="juan@ejemplo.com" type="email" />
              <Field label="Nombre del servicio *" value={form.businessName} onChange={(v: any) => setForm({ ...form, businessName: v })} placeholder="Juan Electricista" />
              <Field label="Nombre *" value={form.firstName} onChange={(v: any) => setForm({ ...form, firstName: v })} placeholder="Juan" />
              <Field label="Apellido *" value={form.lastName} onChange={(v: any) => setForm({ ...form, lastName: v })} placeholder="Pérez" />
              <Field label="Teléfono *" value={form.phone} onChange={(v: any) => setForm({ ...form, phone: v })} placeholder="+51 987 654 321" />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v: any) => setForm({ ...form, whatsapp: v })} placeholder="+51 987 654 321" />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Descripción del servicio..."
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <Field label="Dirección" value={form.address} onChange={(v: any) => setForm({ ...form, address: v })} placeholder="Jr. Ejemplo 123" />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Tipo *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                  <option value="OFICIO">Oficio</option>
                  <option value="NEGOCIO">Negocio</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Categoría *</label>
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                  {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">Localidad *</label>
                <select value={form.localityId} onChange={(e) => setForm({ ...form, localityId: e.target.value })} className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50">
                  {localities?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
              >
                {isLoading ? 'Creando...' : 'Crear proveedor'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-400 mb-2 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
      />
    </div>
  );
}