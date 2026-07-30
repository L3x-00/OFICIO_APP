export const PROFILE_TYPES = ["OFICIO", "PROFESIONAL", "NEGOCIO"] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];
export type LegacyProfileType = "PROFESSIONAL" | "BUSINESS";

export function normalizeProfileType(value: unknown): ProfileType | null {
  if (typeof value !== "string") return null;

  switch (value.trim().toUpperCase()) {
    case "OFICIO":
    case "PROFESSIONAL":
      return "OFICIO";
    case "PROFESIONAL":
      return "PROFESIONAL";
    case "NEGOCIO":
    case "BUSINESS":
      return "NEGOCIO";
    default:
      return null;
  }
}

export const PROFILE_TYPE_META: Record<
  ProfileType,
  {
    label: string;
    pluralLabel: string;
    panelLabel: string;
    description: string;
  }
> = {
  OFICIO: {
    label: "Oficio",
    pluralLabel: "Oficios",
    panelLabel: "Oficios",
    description: "Trabajo técnico, manual o especializado",
  },
  PROFESIONAL: {
    label: "Servicio profesional",
    pluralLabel: "Servicios profesionales",
    panelLabel: "Servicios profesionales",
    description: "Asesoría o atención basada en formación profesional",
  },
  NEGOCIO: {
    label: "Negocio",
    pluralLabel: "Negocios",
    panelLabel: "Negocios",
    description: "Local, empresa, tienda o marca",
  },
};

export interface ProfessionalProfile {
  specialty: string;
  institution?: string | null;
  yearsExperience?: number | null;
  professionalTitle?: string | null;
  registrationNumber?: string | null;
  registrationIssuer?: string | null;
}

export type ProfessionalMigrationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProfessionalMigration {
  id: number;
  status: ProfessionalMigrationStatus;
  specialty: string;
  institution?: string | null;
  yearsExperience?: number | null;
  professionalTitle?: string | null;
  registrationNumber?: string | null;
  registrationIssuer?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderProfileSummary {
  providerId: number;
  businessName: string;
  type: ProfileType;
  verificationStatus: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  isVerified: boolean;
  trustStatus?: string;
  isTrusted?: boolean;
  trustRejectionReason?: string | null;
  phone?: string;
  whatsapp?: string | null;
  description?: string | null;
  address?: string | null;
  categories?: Array<{
    id: number;
    name: string;
    slug: string;
    parentId?: number | null;
    parentName?: string | null;
  }>;
  professionalProfile?: ProfessionalProfile | null;
  professionalMigration?: ProfessionalMigration | null;
  professionalMigrationStatus?: ProfessionalMigrationStatus | null;
}

export interface MyProviderStatus {
  hasProvider: boolean;
  profiles: ProviderProfileSummary[];
}

export interface User {
  id: number;
  email: string;
  phone?: string;
  role: "USUARIO" | "PROVEEDOR" | "ADMIN";
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  department?: string;
  province?: string;
  district?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  fullName?: string;
}

export interface Provider {
  id: number;
  userId: number;
  slug?: string;
  type: ProfileType;
  businessName: string;
  description?: string;
  dni?: string;
  ruc?: string;
  phone: string;
  whatsapp?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  linkedin?: string;
  twitterX?: string;
  telegram?: string;
  whatsappBiz?: string;
  availability: "DISPONIBLE" | "OCUPADO" | "CON_DEMORA";
  isVisible: boolean;
  verificationStatus: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  averageRating: number;
  totalReviews: number;
  planPriority: number;
  localityId: number;
  categoryId: number;
  subscription?: Subscription;
  images: ProviderImage[];
  category?: Category;
  locality?: Locality;
  professionalProfile?: ProfessionalProfile | null;
  professionalMigration?: ProfessionalMigration | null;
  credentialVerified?: boolean;
  /**
   * JSON con servicios/productos del provider. El móvil guarda
   * `services: [{ id, name, description, price, imageUrl, phone }]`
   * acá. El web lo lee para mostrar productos en /panel/servicios.
   */
  scheduleJson?: {
    services?: Array<{
      id: string;
      name: string;
      description?: string;
      price?: number;
      imageUrl?: string;
      phone?: string;
    }>;
    [key: string]: unknown;
  };
}

export interface Subscription {
  id: number;
  providerId: number;
  plan: "GRATIS" | "ESTANDAR" | "PREMIUM";
  status: "ACTIVA" | "VENCIDA" | "CANCELADA" | "GRACIA";
  startDate: string;
  endDate: string;
  graceMonths: number;
  priceUSD: number;
}

export interface ProviderImage {
  id: number;
  providerId: number;
  url: string;
  isCover: boolean;
  order: number;
}

export interface Review {
  id: number;
  providerId: number;
  userId: number;
  rating: number;
  comment?: string;
  photoUrl?: string;
  createdAt: string;
  user?: { firstName: string; lastName: string; avatarUrl?: string };
}

/**
 * Perfil público mínimo de un usuario (cliente). El backend recorta a
 * primer nombre + primer apellido por seguridad. Lo ve el proveedor al tocar
 * la foto del usuario en una reseña o chat.
 */
export interface PublicUserProfile {
  id: number;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId?: number;
  forType?: string;
}

export interface Locality {
  id: number;
  name: string;
  department: string;
}

export interface ServiceRequest {
  id: number;
  userId: number;
  categoryId: number;
  description: string;
  photoUrl?: string;
  budgetMin?: number;
  budgetMax?: number;
  status: "OPEN" | "CLOSED" | "EXPIRED" | "CANCELLED";
  expiresAt: string;
  createdAt: string;
  category?: Category;
  offers?: Offer[];
}

export interface Offer {
  id: number;
  serviceRequestId: number;
  providerId: number;
  price: number;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
  createdAt: string;
}

export interface Analytics {
  totalViews: number;
  totalWhatsappClicks: number;
  totalCallClicks: number;
  totalReviews?: number;
  dailyData: {
    date: string;
    views: number;
    whatsapp: number;
    calls: number;
  }[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface DashboardMetrics {
  activeProviders: number;
  totalProviders: number;
  totalUsers: number;
  totalReviews: number;
  pendingVerifications: number;
  whatsappClicks: number;
  callClicks: number;
  providersInGrace: number;
  providersExpiringSoon: number;
}

export interface Opportunity extends ServiceRequest {
  distanceKm: number;
  canParticipate: boolean;
}
// ========== TIPOS PARA EL MANUAL DE USUARIO ==========
import type { LucideIcon } from 'lucide-react';

export interface GuideStep {
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: 'blue' | 'orange' | 'purple' | 'amber' | 'green' | 'rose';
  screenshot?: string;
  links?: { label: string; href: string }[];
  subSteps?: string[];
}

export interface GuideSection {
  id: string;
  title: string;
  icon: LucideIcon;
  accent: GuideStep['accent'];
  content: GuideStep[];
}
