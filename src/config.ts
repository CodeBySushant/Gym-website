/**
 * ============================================================
 *  SITE CONFIGURATION — edit everything about the brand here
 * ============================================================
 * This is the single source of truth for branding, the admin
 * account, and fallback contact details. No brand names are
 * hardcoded anywhere else in the app.
 */

// The admin email shown as the login placeholder.
// The actual credentials live in server/.env (ADMIN_EMAIL + ADMIN_PASSWORD).
export const ADMIN_EMAIL = 'mesushant.official@gmail.com';

// Brand name, split so the accent color can style the second word.
export const BRAND = {
  first: 'IronCore',
  accent: 'Gym',
  full: 'IronCore Gym',
  city: 'Bhopal',
  tagline: "Bhopal's premier fitness destination. Elite equipment, expert coaching, and a culture of resolve.",
};

// Shown next to the stars in the hero. Set to '' to hide the rating badge
// (only display a rating you can actually back up on Google).
export const GOOGLE_RATING: string = '';

// Fallbacks used only before the admin saves General Settings in the dashboard.
export const DEFAULTS = {
  heroHeadline: 'BORN FROM RESOLVE',
  heroSubline: 'Elite fitness community. Your body is the boss.',
  whatsappNumber: '',
  callNumber: '',
  address: '',
  googleMapsUrl: '',
  heroVideoUrl: '',
};

// Contact email shown in the footer. Set to '' to hide.
export const CONTACT_EMAIL: string = '';

// Social links. Leave a URL empty ('') to hide that icon in the footer.
export const SOCIALS: { instagram: string; facebook: string; twitter: string; youtube: string } = {
  instagram: '',
  facebook: '',
  twitter: '',
  youtube: '',
};
