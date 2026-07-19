export type UserRole = 'admin' | 'member';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
}

export interface Setting {
  id?: string;
  heroHeadline: string;
  heroSubline: string;
  whatsappNumber: string;
  whatsappLink?: string;
  callNumber: string;
  address: string;
  googleMapsUrl: string;
  heroVideoUrl: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
}

export interface Service {
  id?: string;
  title: string;
  category: 'Equipment' | 'Facilities' | 'Services';
  imageUrl: string;
  order?: number;
}

export interface Trainer {
  id?: string;
  name: string;
  specialization: string;
  bio: string;
  imageUrl: string;
  quote: string;
  order?: number;
}

export interface Testimonial {
  id?: string;
  name: string;
  role: string;
  content: string;
  imageUrl?: string;
  order?: number;
}

export interface GalleryItem {
  id?: string;
  type: 'image' | 'video';
  url: string;
  caption?: string;
  order?: number;
}

export interface Lead {
  id?: string;
  name: string;
  phone: string;
  status: 'new' | 'contacted' | 'confirmed' | 'cancelled';
  /** ISO date string set by the backend */
  createdAt: string;
}

export interface PricingPlan {
  id?: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  isPopular: boolean;
  order?: number;
}

export interface HealthTip {
  id?: string;
  title: string;
  content: string;
  imageUrl: string;
  category: 'Nutrition' | 'Workout' | 'Recovery' | 'Mindset';
  createdAt: string;
  order?: number;
}

export interface FAQ {
  id?: string;
  question: string;
  answer: string;
  order?: number;
}
