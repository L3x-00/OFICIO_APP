'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Edit, Trash2, Tag, Loader2, Search, X, Check,
  ChevronDown, ChevronRight, FolderOpen, Folder, ArrowRightLeft,
} from 'lucide-react';
import {
  getCategories, createCategory, updateCategory, deleteCategory, Category,
} from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────

function autoSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function buildTree(flat: Category[]): Category[] {
  const roots: Category[] = [];
  const map: Record<number, Category & { children: Category[] }> = {};
  flat.forEach((c) => { map[c.id] = { ...c, children: c.children ?? [] }; });
  flat.forEach((c) => {
    if (c.parentId == null) roots.push(map[c.id]);
    else if (map[c.parentId]) map[c.parentId].children.push(map[c.id]);
  });
  const sort = (list: Category[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    list.forEach((c) => c.children && sort(c.children));
  };
  sort(roots);
  return roots;
}

const EMPTY_FORM = { name: '', slug: '', iconUrl: '', parentId: '' };

// ── Popover "Mover a…" ────────────────────────────────────────

function MovePopover({
  cat,
  parentOptions,
  onMove,
  onClose,
}: {
  cat: Category;
  parentOptions: Category[];
  onMove: (catId: number, newParentId: number | null) => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const move = async (newParentId: number | null) => {
    setLoading(true);
    await onMove(cat.id, newParentId);
    setLoading(false);
    onClose();
  };

  const isRoot = cat.parentId == null;
  const available = isRoot
    ? [] // las raíces no se mueven por aquí (serían padres de otra raíz, lo cual no está soportado)
    : parentOptions.filter((p) => p.id !== cat.parentId && p.id !== cat.id);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Mover a…</p>
        <p className="text-xs text-gray-600 mt-0.5 truncate">"{cat.name}"</p>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {/* Opción: promover a raíz */}
        {!isRoot && (
          <button
            onClick={() => move(null)}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors text-amber-400"
          >
            <FolderOpen size={13} className="shrink-0" />
            <span>Promover a categoría raíz</span>
          </button>
        )}

        {/* Opciones: mover a otro padre */}
        {available.map((p) => (
          <button
            key={p.id}
            onClick={() => move(p.id)}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors text-gray-300"
          >
            {loading
              ? <Loader2 size={13} className="animate-spin shrink-0 text-blue-400" />
              : <Folder size={13} className="shrink-0 text-blue-400" />}
            <span className="truncate">{p.name}</span>
          </button>
        ))}

        {available.length === 0 && isRoot && (
          <p className="px-3 py-3 text-xs text-gray-600">
            Las categorías raíz no se pueden mover a otra raíz.
          </p>
        )}

        {available.length === 0 && !isRoot && parentOptions.length <= 1 && (
          <p className="px-3 py-3 text-xs text-gray-600">
            No hay otras categorías padre disponibles.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tree, setTree]             = useState<Category[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState('');

  const [actionLoading, setActionLoading]   = useState<number | string | null>(null);
  const [editingId, setEditingId]           = useState<number | null>(null);
  const [movingId, setMovingId]             = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());
  const [toast, setToast]         = useState<string | null>(null);

  // ── Toast ────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── Carga ─────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
      setTree(buildTree(data));
      setExpanded(new Set(data.filter((c) => !c.parentId).map((c) => c.id)));
    } catch (e: any) {
      console.error('Error cargando categorías:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Búsqueda ──────────────────────────────────────────────
  const filtered = search.trim()
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.slug.toLowerCase().includes(search.toLowerCase()),
      )
    : null;

  const parentOptions = categories.filter((c) => c.parentId == null);

  // ── Formulario ────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setShowCreateForm(false);
  };

  const handleNameChange = (name: string) =>
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : autoSlug(name) }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) {
      setFormError('Nombre y slug son obligatorios');
      return;
    }
    setActionLoading('create');
    try {
      await createCategory({
        name:     form.name.trim(),
        slug:     form.slug.trim(),
        iconUrl:  form.iconUrl.trim() || undefined,
        parentId: form.parentId ? Number(form.parentId) : undefined,
      });
      resetForm();
      await load();
      showToast('Categoría creada');
    } catch (e: any) {
      setFormError(e.message || 'Error al crear categoría');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setMovingId(null);
    setForm({
      name:     cat.name,
      slug:     cat.slug,
      iconUrl:  cat.iconUrl ?? '',
      parentId: cat.parentId != null ? String(cat.parentId) : '',
    });
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
        name:     form.name.trim(),
        slug:     form.slug.trim(),
        iconUrl:  form.iconUrl.trim() || undefined,
        parentId: form.parentId ? Number(form.parentId) : null,
      });
      resetForm();
      await load();
      showToast('Categoría actualizada');
    } catch (e: any) {
      setFormError(e.message || 'Error al actualizar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? Los proveedores asociados quedarán sin categoría.`)) return;
    setActionLoading(id);
    try {
      await deleteCategory(id);
      await load();
      showToast('Categoría eliminada');
    } catch (e: any) {
      alert(e.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Mover categoría ──────────────────────────────────────
  const handleMove = async (catId: number, newParentId: number | null) => {
    setActionLoading(catId);
    try {
      const cat = categories.find((c) => c.id === catId);
      await updateCategory(catId, { parentId: newParentId });
      await load();
      const target = newParentId
        ? categories.find((c) => c.id === newParentId)?.name
        : 'categorías raíz';
      showToast(`"${cat?.name}" movida a ${target}`);
    } catch (e: any) {
      alert(e.message || 'Error al mover categoría');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Fila de tabla ─────────────────────────────────────────
  const renderRow = (cat: Category, depth = 0, flat = false): React.ReactElement[] => {
    const isParent    = !cat.parentId;
    const hasChildren = (cat.children?.length ?? 0) > 0;
    const isOpen      = expanded.has(cat.id);
    const isEditing   = editingId === cat.id;
    const isMoving    = movingId === cat.id;
    const provCount   = cat._count?.providers ?? cat.providerCount ?? 0;

    return [
      <tr
        key={`${cat.parentId ?? 'root'}-${cat.id}`}
        className={`hover:bg-white/[0.02] transition-colors ${isParent ? 'bg-white/[0.015]' : ''}`}
      >
        {isEditing ? (
          /* ── Fila de edición inline ── */
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <div>
                <label className="text-xs text-gray-500 block mb-1">Categoría Padre</label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
                >
                  <option value="">— Sin padre (raíz) —</option>
                  {parentOptions
                    .filter((p) => p.id !== cat.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            </div>
            {formError && <p className="text-red-400 text-xs mt-2">{formError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleUpdate(cat.id)}
                disabled={actionLoading === cat.id}
                className="flex items-center gap-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                {actionLoading === cat.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Check size={12} />}
                Guardar
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 px-4 py-1.5 rounded-lg text-xs transition-all"
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </td>
        ) : (
          <>
            {/* Ícono */}
            <td className="p-4 w-14">
              {cat.iconUrl
                ? <img src={cat.iconUrl} alt={cat.name} className="w-8 h-8 rounded-lg object-cover" />
                : (
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Tag size={14} className="text-gray-500" />
                  </div>
                )}
            </td>

            {/* Nombre con indentación */}
            <td className="p-4">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{ paddingLeft: depth * 20 }}
                onClick={() => hasChildren && toggleExpand(cat.id)}
              >
                {hasChildren ? (
                  isOpen
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />
                ) : depth > 0 ? (
                  <span className="w-[14px] shrink-0 text-gray-700 text-xs">└</span>
                ) : null}

                {isParent
                  ? <FolderOpen size={15} className="text-blue-400 shrink-0" />
                  : <Folder size={13} className="text-gray-500 shrink-0" />}

                <span className={`text-sm font-medium ${isParent ? 'text-white' : 'text-gray-300'}`}>
                  {cat.name}
                </span>

                {isParent && hasChildren && (
                  <span className="ml-1 text-xs text-gray-600">
                    ({cat.children!.length})
                  </span>
                )}

                {!cat.isActive && (
                  <span className="ml-2 text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">
                    Inactiva
                  </span>
                )}
              </div>
            </td>

            {/* Slug + padre actual */}
            <td className="p-4">
              <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
                {cat.slug}
              </span>
              {cat.parent && (
                <span className="ml-2 text-xs text-gray-600">
                  en {cat.parent.name}
                </span>
              )}
            </td>

            {/* Proveedores */}
            <td className="p-4">
              <span className="text-gray-400 text-sm">{provCount || '—'}</span>
            </td>

            {/* Acciones */}
            <td className="p-4">
              <div className="flex items-center gap-1.5 relative">
                {/* Editar */}
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                  title="Editar"
                >
                  <Edit size={14} />
                </button>

                {/* Mover (solo subcategorías) */}
                {!isParent && (
                  <div className="relative">
                    <button
                      onClick={() => setMovingId(isMoving ? null : cat.id)}
                      disabled={actionLoading === cat.id}
                      className={`p-2 rounded-lg transition-all ${
                        isMoving
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                      title="Mover a otra categoría"
                    >
                      {actionLoading === cat.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <ArrowRightLeft size={14} />}
                    </button>

                    {isMoving && (
                      <MovePopover
                        cat={cat}
                        parentOptions={parentOptions}
                        onMove={handleMove}
                        onClose={() => setMovingId(null)}
                      />
                    )}
                  </div>
                )}

                {/* Eliminar */}
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  disabled={actionLoading === cat.id}
                  className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                  title="Eliminar"
                >
                  {actionLoading === cat.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              </div>
            </td>
          </>
        )}
      </tr>,

      // Hijos (si el padre está expandido y no estamos en modo búsqueda plana)
      ...(hasChildren && isOpen && !isEditing && !flat
        ? cat.children!.flatMap((child) => renderRow(child, depth + 1))
        : []),
    ];
  };

  // ── Render ────────────────────────────────────────────────
  const rows = filtered
    ? filtered.map((c) => renderRow(c, c.parentId ? 1 : 0, true)).flat()
    : tree.flatMap((c) => renderRow(c, 0));

  const parentCount = categories.filter((c) => !c.parentId).length;
  const childCount  = categories.filter((c) =>  c.parentId != null).length;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <Check size={15} />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-gray-400 text-sm mt-1">
            {parentCount} padres · {childCount} subcategorías
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingId(null);
            setMovingId(null);
            setForm(EMPTY_FORM);
            setFormError(null);
          }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej: Limpieza"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="limpieza"
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
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Categoría Padre
                <span className="ml-1 text-gray-600">(opcional)</span>
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              >
                <option value="">— Categoría raíz —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview nivel */}
          <p className={`text-xs flex items-center gap-1.5 ${form.parentId ? 'text-blue-400' : 'text-gray-500'}`}>
            {form.parentId
              ? <><FolderOpen size={12} /> Subcategoría de <strong>{parentOptions.find((p) => String(p.id) === form.parentId)?.name}</strong></>
              : <><Folder size={12} /> Se creará como categoría raíz (nivel superior)</>}
          </p>

          {formError && <p className="text-red-400 text-xs">{formError}</p>}
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
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Búsqueda + leyenda */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {!search && (
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <FolderOpen size={12} className="text-blue-400" />
              Padre — clic para expandir
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft size={12} className="text-amber-400" />
              Mover subcategoría
            </span>
          </div>
        )}
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
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-gray-600">
                    {search ? 'Sin resultados para esa búsqueda' : 'No hay categorías'}
                  </td>
                </tr>
              ) : (
                rows
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-white/5">
          <span className="text-xs text-gray-600">
            {categories.length} en total — {parentCount} padres · {childCount} hijas
          </span>
        </div>
      </div>
    </div>
  );
}
