'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api, apiUpload } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { profileSchema } from '@/lib/validators';
import { Camera, Upload, Trash2, ChevronDown, ChevronUp, Plus, Globe, Music, Send, MessageCircle, Shield, CheckCircle, XCircle, Clock, Star } from 'lucide-react';
import type { Provider, ProviderImage } from '@/lib/types';

const SOCIAL_FIELDS = [
  { key: 'website', label: 'Página web', icon: Globe },
  { key: 'instagram', label: 'Instagram', icon: Camera },
  { key: 'tiktok', label: 'TikTok', icon: Music },
  { key: 'facebook', label: 'Facebook', icon: MessageCircle },
  { key: 'linkedin', label: 'LinkedIn', icon: Globe },
  { key: 'twitterX', label: 'Twitter (X)', icon: Send },
  { key: 'telegram', label: 'Telegram', icon: Send },
  { key: 'whatsappBiz', label: 'WhatsApp Business', icon: MessageCircle },
];

const DAYS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const DAY_LABELS: Record<string, string> = {
  lun: 'Lunes', mar: 'Martes', mié: 'Miércoles', jue: 'Jueves',
  vie: 'Viernes', sáb: 'Sábado', dom: 'Domingo',
};

export default function PanelPerfilPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = getUser();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [scheduleJson, setScheduleJson] = useState<Record<string, string>>({});
  const [socialFields, setSocialFields] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState<'DISPONIBLE' | 'OCUPADO' | 'CON_DEMORA'>('DISPONIBLE');

  useEffect(() => {
    async function load() {
      try {
        const prov = await api.getMyProfile();
        setProvider(prov);
        setBusinessName(prov.businessName || '');
        setDescription(prov.description || '');
        setPhone(prov.phone || '');
        setWhatsapp(prov.whatsapp || '');
        setAddress(prov.address || '');
        setScheduleJson((prov as any).scheduleJson || {});
        setAvailability(prov.availability ?? 'DISPONIBLE');
        const socials: Record<string, string> = {};
        SOCIAL_FIELDS.forEach(({ key }) => {
          const val = (prov as any)[key];
          if (val) socials[key] = val;
        });
        setSocialFields(socials);
      } catch {
        toast.error('Error al cargar el perfil');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    const result = profileSchema.safeParse({
      businessName,
      description,
      phone,
      whatsapp,
      address,
      ...socialFields,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Datos inválidos');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        businessName,
        description,
        phone,
        whatsapp,
        address,
      };
      Object.entries(socialFields).forEach(([k, v]) => {
        if (v) payload[k] = v;
      });
      if (Object.keys(scheduleJson).length > 0) {
        payload.scheduleJson = scheduleJson;
      }
      const updated = await api.updateMyProfile(payload);
      setProvider(updated);
      toast.success('Perfil actualizado');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen debe pesar menos de 5 MB');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Solo se permiten JPG, PNG o WebP');
      return;
    }
    setUploading(true);
    try {
      const img = await api.uploadImage(file);
      setProvider((prev) =>
        prev ? { ...prev, images: [...prev.images, img] } : prev
      );
      toast.success('Imagen subida');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await api.deleteImage(imageId);
      setProvider((prev) =>
        prev
          ? { ...prev, images: prev.images.filter((i) => i.id !== imageId) }
          : prev
      );
      toast.success('Imagen eliminada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  const handleScheduleChange = (day: string, value: string) => {
    setScheduleJson((prev) => ({ ...prev, [day]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl font-bold text-text-primary">Editar Perfil</h1>

      {/* Avatar y foto principal */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Foto de perfil y galería
        </h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-24 h-24 bg-bg-input rounded-full flex items-center justify-center text-text-muted text-3xl font-bold">
              {provider?.businessName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            {provider?.images?.[0]?.url && (
              <img
                src={provider.images[0].url}
                alt="Avatar"
                className="absolute inset-0 w-24 h-24 rounded-full object-cover"
              />
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white"
            >
              <Camera size={14} />
            </button>
          </div>
          <div>
            <p className="text-text-secondary text-sm">
              Haz clic en el icono de cámara para subir una foto
            </p>
            <p className="text-text-muted text-xs mt-1">JPG, PNG o WebP. Máx. 5 MB</p>
          </div>
        </div>

        {/* Galería */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
          {provider?.images?.map((img, idx) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
              />
              {(img.isCover || idx === 0) && (
                <span className="absolute bottom-1 left-1 bg-primary/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <Star size={8} /> Portada
                </span>
              )}
              <button
                onClick={() => handleDeleteImage(img.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full aspect-square rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-text-muted hover:border-primary/40 transition-colors"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <Plus size={24} />
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Disponibilidad */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Disponibilidad</h2>
        <div className="flex gap-3 flex-wrap">
          {(['DISPONIBLE', 'OCUPADO', 'CON_DEMORA'] as const).map((status) => (
            <button
              key={status}
              onClick={async () => {
                try {
                  await api.updateMyProfile({ availability: status });
                  setAvailability(status);
                  setProvider((prev) => prev ? { ...prev, availability: status } : prev);
                  toast.success('Disponibilidad actualizada');
                } catch {
                  toast.error('Error al actualizar disponibilidad');
                }
              }}
              className={`flex-1 min-w-[100px] py-2.5 rounded-button text-sm font-medium transition-colors ${
                availability === status
                  ? 'bg-primary text-white'
                  : 'bg-bg-input text-text-muted hover:text-text-secondary'
              }`}
            >
              {status === 'DISPONIBLE' ? 'Disponible' : status === 'OCUPADO' ? 'Ocupado' : 'Con demora'}
            </button>
          ))}
        </div>
      </div>

      {/* Verificación de confianza */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="text-primary" size={20} />
          <h2 className="text-lg font-semibold text-text-primary">Verificación de confianza</h2>
        </div>
        {provider?.verificationStatus === 'APROBADO' && (
          <div className="flex items-center gap-2 text-green">
            <CheckCircle size={18} />
            <span className="text-sm font-medium">Perfil verificado</span>
          </div>
        )}
        {provider?.verificationStatus === 'PENDIENTE' && (
          <div className="flex items-center gap-2 text-amber">
            <Clock size={18} />
            <span className="text-sm font-medium">Verificación en revisión</span>
          </div>
        )}
        {provider?.verificationStatus === 'RECHAZADO' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red">
              <XCircle size={18} />
              <span className="text-sm font-medium">Verificación rechazada</span>
            </div>
            <p className="text-text-muted text-xs">
              Tu solicitud de verificación fue rechazada. Contacta al soporte para más información.
            </p>
          </div>
        )}
      </div>

      {/* Información básica */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Información básica
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField
            label="Nombre del negocio / servicio"
            value={businessName}
            onChange={setBusinessName}
          />
          <InputField
            label="Teléfono"
            value={phone}
            onChange={setPhone}
            type="tel"
          />
          <InputField
            label="WhatsApp"
            value={whatsapp}
            onChange={setWhatsapp}
            type="tel"
          />
          <InputField
            label="Dirección"
            value={address}
            onChange={setAddress}
          />
        </div>
        <div className="mt-4">
          <label className="block text-text-secondary text-sm mb-1.5">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full bg-bg-input border border-white/5 rounded-button p-3 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            placeholder="Describe tu servicio o negocio..."
          />
          <p className="text-text-muted text-xs mt-1">
            {description.length}/500
          </p>
        </div>
      </div>

      {/* Redes sociales (colapsable) */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <button
          onClick={() => setShowSocial(!showSocial)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-text-primary">
            Redes sociales
          </h2>
          {showSocial ? (
            <ChevronUp className="text-text-muted" size={20} />
          ) : (
            <ChevronDown className="text-text-muted" size={20} />
          )}
        </button>
        {showSocial && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {SOCIAL_FIELDS.map(({ key, label, icon: Icon }) => (
              <InputField
                key={key}
                label={label}
                value={socialFields[key] || ''}
                onChange={(v) =>
                  setSocialFields((prev) => ({ ...prev, [key]: v }))
                }
                icon={<Icon size={16} />}
              />
            ))}
          </div>
        )}
      </div>

      {/* Horario (colapsable) */}
      <div className="bg-bg-card border border-white/5 rounded-card p-6">
        <button
          onClick={() => setShowSchedule(!showSchedule)}
          className="flex items-center justify-between w-full text-left"
        >
          <h2 className="text-lg font-semibold text-text-primary">
            Horario de atención
          </h2>
          {showSchedule ? (
            <ChevronUp className="text-text-muted" size={20} />
          ) : (
            <ChevronDown className="text-text-muted" size={20} />
          )}
        </button>
        {showSchedule && (
          <div className="space-y-3 mt-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="text-text-secondary text-sm w-24">
                  {DAY_LABELS[day]}
                </span>
                <input
                  type="text"
                  value={scheduleJson[day] || ''}
                  onChange={(e) => handleScheduleChange(day, e.target.value)}
                  placeholder="Ej: 8:00-18:00"
                  className="flex-1 bg-bg-input border border-white/5 rounded-button px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-8 py-3 rounded-button font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Upload size={18} />
        )}
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-bg-input border border-white/5 rounded-button py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors ${
            icon ? 'pl-10 pr-3' : 'px-3'
          }`}
        />
      </div>
    </div>
  );
}