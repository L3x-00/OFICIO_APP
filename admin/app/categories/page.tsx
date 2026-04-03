'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Tag, Loader2, Search, X, Check,
} from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory, Category } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);

  // Form state reutilizado para crear y editar
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ name: '', slug: '', iconUrl: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCategories(search || undefined);
      setCategories(data);
    } catch (e: any) {
      console.error('Error cargando categorías:', e);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 300);
    return () => clearTimeout(timer);
  }, [load]);

  // Genera slug automáticamente a partir del nombre
  const autoSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: autoSlug(name) }));
  };

  const resetForm = () => {
    setForm({ name: '', slug: '', iconUrl: '' });
    setFormError(null);
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Nombre y slug son obligatorios');
      return;
    }
    setActionLoading('create');
    try {
      await createCategory({
        name: form.name.trim(),
        slug: form.slug.trim(),
        iconUrl: form.iconUrl.trim() || undefined,
      });
      resetForm();
      await load();
    } catch (e: any) {
      setFormError(e.message || 'Error al crear categoría');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, iconUrl: cat.iconUrl ?? '' });
    setFormError(null);
    setShowCreateForm(false);
  };

  const handleUpdate = async (id: number) => {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Nombre y slug son obligatorios');
      return;
    }
    setActionLoading(id);
    try {
      await updateCategory(id, {
        name: form.name.trim(),
        slug: form.slug.trim(),
        iconUrl: form.iconUrl.trim() || undefined,
      });
      resetForm();
      await load();
    } catch (e: any) {
      setFormError(e.message || 'Error al actualizar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los proveedores asociados quedarán sin categoría.`)) return;
    setActionLoading(id);
    try {
      await deleteCategory(id);
      await load();
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-gray-400 text-sm mt-1">
            Gestiona las categorías de servicios
          </p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setEditingId(null); setForm({ name: '', slug: '', iconUrl: '' }); setFormError(null); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus size={16} />
          Nueva Categoría
        </button>
      </div>

      {/* Formulario de creación */}
      {showCreateForm && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-blue-500/30 p-6 space-y-4">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Nueva Categoría</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Electricidad"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="electricidad"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">URL del ícono (opcional)</label>
              <input
                value={form.iconUrl}
                onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              />
            </div>
          </div>
          {formError && (
            <p className="text-red-400 text-xs">{formError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={actionLoading === 'create'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
            >
              {actionLoading === 'create'
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              Crear
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-5 py-2 rounded-xl text-sm transition-all"
            >
              <X size={14} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar categoría..."
          className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
        />
      </div>

      {/* Tabla */}
      <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                {['Ícono', 'Nombre', 'Slug', 'Proveedores', 'Acciones'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-500" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-600">
                    No hay categorías
                  </td>
                </tr>
              ) : (
                filtered.map((cat) => (
                  <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                    {editingId === cat.id ? (
                      // ── Fila de edición inline ──
                      <td colSpan={4} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                            <input
                              value={form.name}
                              onChange={(e) => handleNameChange(e.target.value)}
                              className="w-full bg-[#111] border border-blue-500/30 rounded-xl px-3 py-2 text-white text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Slug</label>
                            <input
                              value={form.slug}
                              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                              className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">URL ícono</label>
                            <input
                              value={form.iconUrl}
                              onChange={(e) => setForm((f) => ({ ...f, iconUrl: e.target.value }))}
                              className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
                            />
                          </div>
                        </div>
                        {formError && <p className="text-red-400 text-xs mt-2">{formError}</p>}
                      </td>
                    ) : (
                      <>
                        <td className="p-4">
                          {cat.iconUrl
                            ? <img src={cat.iconUrl} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                            : <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Tag size={14} className="text-gray-500" /></div>
                          }
                        </td>
                        <td className="p-4">
                          <span className="text-white font-medium text-sm">{cat.name}</span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
                            {cat.slug}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-400 text-sm">
                            {cat.providerCount ?? '—'}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {editingId === cat.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(cat.id)}
                              disabled={actionLoading === cat.id}
                              className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all"
                            >
                              {actionLoading === cat.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Check size={14} />}
                            </button>
                            <button
                              onClick={resetForm}
                              className="p-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-all"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(cat)}
                              className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, cat.name)}
                              disabled={actionLoading === cat.id}
                              className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                            >
                              {actionLoading === cat.id
                                ? <Loader2 size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {filtered.length} categoría(s)
          </span>
        </div>
      </div>
    </div>
  );
}
