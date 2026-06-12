// Plantillas HTML/CSS inline para los correos transaccionales de Servi.
// Centralizadas aquí para que todos los emails compartan branding (logo Ofi,
// naranja #F97316) y un footer único con redes / Play Store / web.

const PRIMARY = '#F97316';
const LOGO_URL =
  process.env.EMAIL_LOGO_URL ?? 'https://oficioapp.org.pe/images/logo/ofi.png';
const WEB_URL = process.env.WEB_APP_URL ?? 'https://oficioapp.org.pe';
const PLAY_STORE_URL =
  process.env.PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.oficioapp.mobile';
const SUPPORT_WHATSAPP =
  process.env.SUPPORT_WHATSAPP_URL ?? 'https://wa.me/51999999999';
const SOCIAL = {
  tiktok: process.env.SOCIAL_TIKTOK_URL ?? 'https://www.tiktok.com/@ofiapp.pe',
  facebook:
    process.env.SOCIAL_FACEBOOK_URL ?? 'https://www.facebook.com/ofiapp.pe',
  instagram:
    process.env.SOCIAL_INSTAGRAM_URL ?? 'https://www.instagram.com/ofiapp.pe',
};

function footer(): string {
  const link = (href: string, label: string) =>
    `<a href="${href}" style="color:${PRIMARY};text-decoration:none;margin:0 6px;font-size:12px">${label}</a>`;
  return `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #eee;text-align:center">
      <p style="margin:0 0 8px">
        ${link(SOCIAL.tiktok, 'TikTok')}·${link(SOCIAL.facebook, 'Facebook')}·${link(SOCIAL.instagram, 'Instagram')}·${link(SUPPORT_WHATSAPP, 'Soporte WhatsApp')}
      </p>
      <p style="margin:0 0 8px">
        ${link(PLAY_STORE_URL, 'Descargar en Google Play')}·${link(WEB_URL, 'oficioapp.org.pe')}
      </p>
      <p style="color:#bbb;font-size:11px;margin:8px 0 0">
        Servi — Marketplace de servicios locales del Perú.<br/>
        Soporte: soporteofiapp@gmail.com
      </p>
    </div>`;
}

/**
 * Envuelve el contenido en la plantilla base de Servi (header con logo +
 * footer con redes). `bodyHtml` es el contenido específico de cada correo.
 */
export function baseEmail(opts: {
  heading: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
}): string {
  const ctaHtml = opts.cta
    ? `<div style="text-align:center;margin:24px 0">
         <a href="${opts.cta.url}" style="display:inline-block;background:${PRIMARY};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px">${opts.cta.label}</a>
       </div>`
    : '';
  return `
  <div style="background:#f6f6f8;padding:24px 0">
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:0;background:#fff;border-radius:14px;overflow:hidden">
      <div style="background:${PRIMARY};padding:20px;text-align:center">
        <img src="${LOGO_URL}" alt="Servi" height="40" style="height:40px;vertical-align:middle"/>
      </div>
      <div style="padding:28px 28px 8px">
        <h2 style="color:#1a1a1a;margin:0 0 12px;font-size:20px">${opts.heading}</h2>
        ${opts.bodyHtml}
        ${ctaHtml}
      </div>
      <div style="padding:0 28px 24px">
        ${footer()}
      </div>
    </div>
  </div>`;
}

export const EMAIL_BRANDING = { PRIMARY, WEB_URL, PLAY_STORE_URL };
