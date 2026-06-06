'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image'; // Regla: no-img-element
import {
  Plus, Edit, Trash2, Tag, Loader2, Search, X, Check,
  ChevronDown, ChevronRight, FolderOpen, Folder, ArrowRightLeft,
  Briefcase, Wrench,
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

const EMPTY_FORM = { name: '', slug: '', iconUrl: '', parentId: '', forType: '' };

// Regla: no-explicit-any - Usamos interfaz tipada
interface EditAction {
  cat: Category;
  startMoving?: boolean;
}

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
    ? [] 
    : parentOptions.filter((p) => p.id !== cat.parentId && p.id !== cat.id);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-white/5">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Mover a…</p>
        {/* Regla: no-unescaped-entities - Comillas escapadas */}
        <p className="text-xs text-gray-600 mt-0.5 truncate">&ldquo;{cat.name}&rdquo;</p>
      </div>

      <div className="max-h-52 overflow-y-auto">
        {!isRoot && (
          <button
            onClick={() => move(null)}
            disabled={loading}
            className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors text-amber-400"
          >
            <FolderOpen size={13} className="shrink-0" />
            <span>Convertir en Sector</span>
          </button>
        )}

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
            Los Sectores no se mueven desde aquí.
          </p>
        )}

        {available.length === 0 && !isRoot && parentOptions.length <= 1 && (
          <p className="px-3 py-3 text-xs text-gray-600">
            No hay otros Sectores disponibles.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Componente de Sección (Negocio / Oficio) ──────────────────

function CategorySection({
  title,
  type,
  icon: Icon,
  accentColor,
  allCategories,
  isLoading,
  actionLoading,
  editingId,
  movingId,
  expanded,
  search,
  form,
  formError,
  showCreateForm,
  onToggleExpand,
  onEdit,
  onMove,
  onDelete,
  onUpdate,
  onCreate,
  onResetForm,
  onShowCreate,
  onNameChange,
  onFormChange,
}: {
  title: string;
  type: string | null;
  icon: React.ElementType;
  accentColor: string;
  allCategories: Category[];
  isLoading: boolean;
  actionLoading: number | string | null;
  editingId: number | null;
  movingId: number | null;
  expanded: Set<number>;
  search: string;
  form: typeof EMPTY_FORM;
  formError: string | null;
  showCreateForm: boolean;
  onToggleExpand: (id: number) => void;
  onEdit: (action: EditAction) => void;
  onMove: (catId: number, newParentId: number | null) => Promise<void>;
  onDelete: (id: number, name: string) => void;
  onUpdate: (id: number) => void;
  onCreate: () => void;
  onResetForm: () => void;
  onShowCreate: () => void;
  onNameChange: (name: string) => void;
  onFormChange: (field: string, value: string) => void;
}) {
  const sectionCategories = useMemo(() => {
    const rootIdsForType = new Set(
      allCategories.filter(c => c.parentId == null && c.forType === type).map(c => c.id)
    );
    return allCategories.filter(c => rootIdsForType.has(c.id) || (c.parentId != null && rootIdsForType.has(c.parentId!)));
  }, [allCategories, type]);

  const sectionTree = useMemo(() => buildTree(sectionCategories), [sectionCategories]);
  const sectionParentOptions = useMemo(() => sectionCategories.filter((c) => c.parentId == null), [sectionCategories]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return sectionCategories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [search, sectionCategories]);

  const renderRow = (cat: Category, depth = 0, flat = false): React.ReactElement[] => {
    const isParent    = !cat.parentId;
    const hasChildren = (cat.children?.length ?? 0) > 0;
    const isOpen      = expanded.has(cat.id);
    const isEditing   = editingId === cat.id;
    const isMoving    = movingId === cat.id; // Regla: no-unused-vars - Se usa abajo en la clase CSS
    const provCount   = cat._count?.providers ?? cat.providerCount ?? 0;

    return [
      <tr
        key={`${cat.parentId ?? 'root'}-${cat.id}`}
        className={`hover:bg-white/[0.02] transition-colors ${isParent ? 'bg-white/[0.015]' : ''}`}
      >
        {isEditing ? (
          <td colSpan={5} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  className="w-full bg-[#111] border border-blue-500/30 rounded-xl px-3 py-2 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => onFormChange('slug', e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">URL ícono</label>
                <input
                  value={form.iconUrl}
                  onChange={(e) => onFormChange('iconUrl', e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sector</label>
                <select
                  value={form.parentId}
                  onChange={(e) => onFormChange('parentId', e.target.value)}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
                >
                  <option value="">— Es un Sector (sin padre) —</option>
                  {sectionParentOptions
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
                onClick={() => onUpdate(cat.id)}
                disabled={actionLoading === cat.id}
                className="flex items-center gap-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
              >
                {actionLoading === cat.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Check size={12} />}
                Guardar
              </button>
              <button
                onClick={onResetForm}
                className="flex items-center gap-2 bg-white/5 text-gray-400 hover:bg-white/10 px-4 py-1.5 rounded-lg text-xs transition-all"
              >
                <X size={12} /> Cancelar
              </button>
            </div>
          </td>
        ) : (
          <>
            <td className="p-4 w-14">
              {cat.iconUrl
                // Regla: no-img-element - Usamos Image de next/image
                ? <Image src={cat.iconUrl} alt={cat.name} width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
                : (
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Tag size={14} className="text-gray-500" />
                  </div>
                )}
            </td>

            <td className="p-4">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                style={{ paddingLeft: depth * 20 }}
                onClick={() => hasChildren && onToggleExpand(cat.id)}
              >
                {hasChildren ? (
                  isOpen
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />
                ) : depth > 0 ? (
                  <span className="w-[14px] shrink-0 text-gray-700 text-xs">└</span>
                ) : null}

                {isParent
                  ? <FolderOpen size={15} className={`${accentColor} shrink-0`} />
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

            <td className="p-4">
              <span className="text-xs font-mono text-gray-400 bg-white/5 px-2 py-1 rounded-lg">
                {cat.slug}
              </span>
              {cat.parent && (
                <span className="ml-2 text-xs text-gray-600">
                  en {cat.parent.name}
                </span>
              )}
              {cat.forType && (
                <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  cat.forType === 'OFICIO'
                    ? 'bg-purple-500/15 text-purple-400'
                    : 'bg-blue-500/15 text-blue-400'
                }`}>
                  {cat.forType}
                </span>
              )}
            </td>

            <td className="p-4">
              <span className="text-gray-400 text-sm">{provCount || '—'}</span>
            </td>

            <td className="p-4">
              <div className="flex items-center gap-1.5 relative">
                <button
                  onClick={() => onEdit({ cat })}
                  className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                  title="Editar"
                >
                  <Edit size={14} />
                </button>

                {!isParent && (
                  <div className="relative">
                    <button
                      onClick={() => onEdit({ cat, startMoving: !isMoving })}
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
                        parentOptions={sectionParentOptions}
                        onMove={onMove}
                        onClose={onResetForm}
                      />
                    )}
                  </div>
                )}

                <button
                  onClick={() => onDelete(cat.id, cat.name)}
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

      ...(hasChildren && isOpen && !isEditing && !flat
        ? cat.children!.flatMap((child) => renderRow(child, depth + 1))
        : []),
    ];
  };

  const rows = filtered
    ? filtered.map((c) => renderRow(c, c.parentId ? 1 : 0, true)).flat()
    : sectionTree.flatMap((c) => renderRow(c, 0));

  const parentCount = sectionCategories.filter((c) => !c.parentId).length;
  const childCount  = sectionCategories.filter((c) =>  c.parentId != null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-white/5 ${accentColor}`}>
            <Icon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {parentCount} Sectores · {childCount} Especialidades
            </p>
          </div>
        </div>
        <button
          onClick={() => onShowCreate()}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          <Plus size={16} />
          Nueva
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6 space-y-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider">
            Nueva Categoría en {title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre *</label>
              <input
                value={form.name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Ej: Limpieza"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => onFormChange('slug', e.target.value)}
                placeholder="limpieza"
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm font-mono focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">URL del ícono</label>
              <input
                value={form.iconUrl}
                onChange={(e) => onFormChange('iconUrl', e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sector</label>
              <select
                value={form.parentId}
                onChange={(e) => onFormChange('parentId', e.target.value)}
                className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-blue-500/50 outline-none"
              >
                <option value="">— Es un Sector (nivel superior) —</option>
                {sectionParentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <p className={`text-xs flex items-center gap-1.5 ${form.parentId ? 'text-blue-400' : 'text-gray-500'}`}>
            {form.parentId
              ? <><FolderOpen size={12} /> Especialidad del Sector <strong>{sectionParentOptions.find((p) => String(p.id) === form.parentId)?.name}</strong></>
              : <><Folder size={12} /> Se creará como Sector (nivel superior) con tipo <strong>{type || 'Ambos'}</strong></>}
          </p>

          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <div className="flex gap-3">
            <button
              onClick={onCreate}
              disabled={actionLoading === 'create'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all"
            >
              {actionLoading === 'create'
                ? <Loader2 size={14} className="animate-spin" />
                : <Check size={14} />}
              Crear
            </button>
            <button
              onClick={onResetForm}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-5 py-2 rounded-xl text-sm transition-all"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

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
                    No hay categorías de tipo {title} todavía.
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
            {sectionCategories.length} en total — {parentCount} Sectores · {childCount} Especialidades
          </span>
        </div>
      </div>
    </div>
  );
}


// ── Componente principal ──────────────────────────────────────

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [search, setSearch]         = useState('');

  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [movingId, setMovingId]           = useState<number | null>(null);
  const [creatingForType, setCreatingForType] = useState<string | null>(null); 
  
  const [form, setForm]       = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<Set<number>>(new Set());
  const [toast, setToast]         = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
      setExpanded(new Set(data.filter((c) => !c.parentId).map((c) => c.id)));
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditingId(null);
    setMovingId(null);
    setCreatingForType(null);
  };

  const handleNameChange = (name: string) =>
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : autoSlug(name) }));

  const handleFormChange = (field: string, value: string) => 
    setForm((f) => ({ ...f, [field]: value }));

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
        forType:  form.forType || creatingForType || undefined,
      });
      resetForm();
      await load();
      showToast('Categoría creada');
    } catch (err) {
      // Regla: no-explicit-any - Tipado estricto en catch
      const error = err as Error;
      setFormError(error.message || 'Error al crear categoría');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (action: EditAction) => {
    const { cat, startMoving } = action;
    setEditingId(cat.id);
    setMovingId(startMoving ? cat.id : null);
    
    setForm({
      name:     cat.name,
      slug:     cat.slug,
      iconUrl:  cat.iconUrl ?? '',
      parentId: cat.parentId != null ? String(cat.parentId) : '',
      forType:  cat.forType ?? '',
    });
    setFormError(null);
    setCreatingForType(null); 
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
        forType:  form.forType || null,
      });
      resetForm();
      await load();
      showToast('Categoría actualizada');
    } catch (err) {
      const error = err as Error;
      setFormError(error.message || 'Error al actualizar');
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
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Error al eliminar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMove = async (catId: number, newParentId: number | null) => {
    setActionLoading(catId);
    try {
      const cat = categories.find((c) => c.id === catId);
      await updateCategory(catId, { parentId: newParentId });
      await load();
      const target = newParentId
        ? categories.find((c) => c.id === newParentId)?.name
        : 'Sectores';
      showToast(`"${cat?.name}" movida a ${target}`);
    } catch (err) {
      const error = err as Error;
      alert(error.message || 'Error al mover categoría');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      // Regla: no-unused-expressions - Cambio de ternario a if/else
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const handleShowCreate = (type: string | null) => {
    resetForm();
    setCreatingForType(type);
    setForm(f => ({ ...f, forType: type || '' }));
  };

  return (
    <div className="space-y-10">

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fade-in">
          <Check size={15} />
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Categorías</h1>
          <p className="text-gray-400 text-sm mt-1">
            Administra los Sectores y Especialidades separados por tipo de proveedor
          </p>
        </div>
      </div>

      <div className="relative max-w-sm">
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

      <CategorySection
        title="Para Negocios"
        type="NEGOCIO"
        icon={Briefcase}
        accentColor="text-blue-400"
        allCategories={categories}
        isLoading={isLoading}
        actionLoading={actionLoading}
        editingId={editingId}
        movingId={movingId}
        expanded={expanded}
        search={search}
        form={form}
        formError={formError}
        showCreateForm={creatingForType === 'NEGOCIO'}
        onToggleExpand={toggleExpand}
        onEdit={handleEdit}
        onMove={handleMove}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
        onResetForm={resetForm}
        onShowCreate={() => handleShowCreate('NEGOCIO')}
        onNameChange={handleNameChange}
        onFormChange={handleFormChange}
      />

      <CategorySection
        title="Para Oficios"
        type="OFICIO"
        icon={Wrench}
        accentColor="text-purple-400"
        allCategories={categories}
        isLoading={isLoading}
        actionLoading={actionLoading}
        editingId={editingId}
        movingId={movingId}
        expanded={expanded}
        search={search}
        form={form}
        formError={formError}
        showCreateForm={creatingForType === 'OFICIO'}
        onToggleExpand={toggleExpand}
        onEdit={handleEdit}
        onMove={handleMove}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onCreate={handleCreate}
        onResetForm={resetForm}
        onShowCreate={() => handleShowCreate('OFICIO')}
        onNameChange={handleNameChange}
        onFormChange={handleFormChange}
      />

    </div>
  );
}