'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
  const [categories, setCategories]  = useState<any[]>([]);
  const [localities, setLocalities]  = useState<any[]>([]);
  const [isLoading, setIsLoading]    = useState(false);
  const [error, setError]            = useState('');
  const [tempPassword, setTempPassword] = useState('');

  useEffect(() => {
    fetch(`${BASE_URL}/admin/form-options`)
      .then((r) => r.json())
      .then((d) => {
        setCategories(d.categories);
        setLocalities(d.localities);
        if (d.categories.length > 0)
          setForm((f) => ({ ...f, categoryId: d.categories[0].id }));
        if (d.localities.length > 0)
          setForm((f) => ({ ...f, localityId: d.localities[0].id }));
      });
  }, []);

  const handleSubmit = async () => {
    if (!form.email || !form.firstName || !form.businessName || !form.phone) {
      setError('Los campos marcados con * son obligatorios');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/admin/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          categoryId: parseInt(form.categoryId),
          localityId: parseInt(form.localityId),
        }),
      });
      if (!res.ok) throw new Error('Error al crear el proveedor');
      const data = await res.json();
      setTempPassword(data.tempPassword);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Nuevo proveedor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {tempPassword ? (
          // Mostrar contraseña temporal después de crear
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-white font-bold text-lg">
              ¡Proveedor creado exitosamente!
            </h3>
            <p className="text-gray-400 text-sm">
              Comparte estas credenciales con el proveedor:
            </p>
            <div className="bg-bg-dark rounded-xl p-4 text-left space-y-2">
              <p className="text-sm text-gray-400">
                Email: <span className="text-white font-mono">{form.email}</span>
              </p>
              <p className="text-sm text-gray-400">
                Contraseña temporal:{' '}
                <span className="text-primary font-mono font-bold text-base">
                  {tempPassword}
                </span>
              </p>
            </div>
            <p className="text-xs text-gray-500">
              El proveedor deberá cambiar esta contraseña al ingresar.
            </p>
            <button
              onClick={onSuccess}
              className="bg-primary text-white px-6 py-2.5 rounded-xl font-semibold"
            >
              Listo
            </button>
          </div>
        ) : (
          // Formulario de creación
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Email *"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="juan@ejemplo.com"
                type="email"
              />
              <Field
                label="Nombre del servicio *"
                value={form.businessName}
                onChange={(v) => setForm({ ...form, businessName: v })}
                placeholder="Juan Electricista"
              />
              <Field
                label="Nombre *"
                value={form.firstName}
                onChange={(v) => setForm({ ...form, firstName: v })}
                placeholder="Juan"
              />
              <Field
                label="Apellido *"
                value={form.lastName}
                onChange={(v) => setForm({ ...form, lastName: v })}
                placeholder="Pérez"
              />
              <Field
                label="Teléfono *"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+51 987 654 321"
              />
              <Field
                label="WhatsApp"
                value={form.whatsapp}
                onChange={(v) => setForm({ ...form, whatsapp: v })}
                placeholder="+51 987 654 321"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 mb-2 block">
                Descripción
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Descripción del servicio..."
                className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <Field
              label="Dirección"
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
              placeholder="Jr. Ejemplo 123"
            />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Tipo *
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="OFICIO">Oficio</option>
                  <option value="NEGOCIO">Negocio</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Categoría *
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 mb-2 block">
                  Localidad *
                </label>
                <select
                  value={form.localityId}
                  onChange={(e) => setForm({ ...form, localityId: e.target.value })}
                  className="w-full bg-bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50"
                >
                  {localities.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-sm"
              >
                Cancelar
              </button>
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

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-400 mb-2 block">
        {label}
      </label>
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