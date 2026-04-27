import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const profileSchema = z.object({
  businessName: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(500).optional(),
  phone: z.string().min(1, "El teléfono es obligatorio").max(20),
  whatsapp: z.string().max(20).optional(),
  address: z.string().max(200).optional(),
  website: z.string().max(100).optional(),
  instagram: z.string().max(50).optional(),
  tiktok: z.string().max(50).optional(),
  facebook: z.string().max(100).optional(),
  linkedin: z.string().max(100).optional(),
  twitterX: z.string().max(50).optional(),
  telegram: z.string().max(50).optional(),
  whatsappBiz: z.string().max(20).optional(),
});

export const offerSchema = z.object({
  price: z.number().min(1, "El precio es obligatorio"),
  message: z.string().min(1, "El mensaje es obligatorio").max(500),
});

export const yapePaymentSchema = z.object({
  plan: z.enum(["ESTANDAR", "PREMIUM"]),
  amount: z.number().min(1),
  verificationCode: z.string().length(3, "El código debe tener 3 dígitos"),
  note: z.string().max(200).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type OfferFormData = z.infer<typeof offerSchema>;
export type YapePaymentFormData = z.infer<typeof yapePaymentSchema>;