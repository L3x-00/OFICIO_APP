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
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
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
        <label className="block text-white/60 text-sm font-medium mb-2">
          Descripción
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-300 resize-none"
          placeholder="Describe tu servicio o negocio..."
        />
        <p className="text-white/30 text-xs mt-1.5">{description.length}/500</p>
      </div>
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="btn btn-primary btn-lg press-effect disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2"
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
      <label className="block text-white/60 text-sm font-medium mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-300"
      />
    </div>
  );
}