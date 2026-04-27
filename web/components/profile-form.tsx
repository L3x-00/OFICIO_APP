'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { profileSchema } from '@/lib/validators';
import type { Provider } from '@/lib/types';

interface Props {
  provider: Provider | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
}

export default function ProfileForm({ provider, onSave, saving }: Props) {
  const [businessName, setBusinessName] = useState(provider?.businessName || '');
  const [description, setDescription] = useState(provider?.description || '');
  const [phone, setPhone] = useState(provider?.phone || '');
  const [whatsapp, setWhatsapp] = useState(provider?.whatsapp || '');
  const [address, setAddress] = useState(provider?.address || '');

  const handleSubmit = async () => {
    const result = profileSchema.safeParse({
      businessName,
      description,
      phone,
      whatsapp,
      address,
    });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || 'Datos inválidos');
      return;
    }
    await onSave({
      businessName,
      description,
      phone,
      whatsapp,
      address,
    });
  };

  return (
    <div className="space-y-4">
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
      <div>
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
        <p className="text-text-muted text-xs mt-1">{description.length}/500</p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full sm:w-auto bg-primary hover:bg-primary-dark disabled:opacity-50 text-white px-8 py-3 rounded-button font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <span>Guardar cambios</span>
        )}
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-text-secondary text-sm mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-bg-input border border-white/5 rounded-button px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-primary/50 transition-colors"
      />
    </div>
  );
}