// lib/social-utils.ts
// Constantes y utilidades para perfiles públicos y redes sociales

export const SCHEDULE_DAYS: Array<[string, string]> = [
  ['lun', 'Lunes'],
  ['mar', 'Martes'],
  ['mie', 'Miércoles'],
  ['jue', 'Jueves'],
  ['vie', 'Viernes'],
  ['sab', 'Sábado'],
  ['dom', 'Domingo'],
];

export const SOCIAL_DEFS: Array<{
  key: string;
  icon: string;
  label: string;
  prefix: string;
}> = [
  { key: 'whatsapp',  icon: 'whatsapp.svg',  label: 'WhatsApp',  prefix: 'https://wa.me/' },
  { key: 'instagram', icon: 'instagram.svg', label: 'Instagram', prefix: 'https://instagram.com/' },
  { key: 'tiktok',    icon: 'tiktok.svg',    label: 'TikTok',    prefix: 'https://tiktok.com/@' },
  { key: 'facebook',  icon: 'facebook.svg',  label: 'Facebook',  prefix: 'https://facebook.com/' },
  { key: 'linkedin',  icon: 'linkedin.svg',  label: 'LinkedIn',  prefix: 'https://linkedin.com/in/' },
  { key: 'telegram',  icon: 'telegram.svg',  label: 'Telegram',  prefix: 'https://t.me/' },
  { key: 'twitterX',  icon: 'twitterx.svg',  label: 'X',         prefix: 'https://x.com/' },
  { key: 'website',   icon: 'website.svg',   label: 'Sitio web', prefix: 'https://' },
];

export function buildSocialUrl(prefix: string, value: string): string {
  const v = value.trim();
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (prefix === 'https://wa.me/') return prefix + v.replace(/\D/g, '');
  return prefix + v.replace(/^@/, '');
}