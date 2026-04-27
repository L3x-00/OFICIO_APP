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
  type: "OFICIO" | "NEGOCIO";
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