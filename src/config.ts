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

// Brand name, split so the accent color can style the second part.
export const BRAND = {
  first: 'Supermen',
  accent: 'Fitness Gym',
  full: 'Supermen Fitness Gym',
  city: 'Bhopal',
  tagline: "Nehru Nagar's home for serious training. Elite equipment, expert coaching, and a community that shows up.",
};

// Shown next to the stars in the hero. Set to '' to hide the rating badge
// (only display a rating you can actually back up on Google).
export const GOOGLE_RATING: string = '';

// Fallbacks used only before the admin saves General Settings in the dashboard.
export const DEFAULTS = {
  heroHeadline: 'BORN FROM RESOLVE',
  heroSubline: 'Elite fitness community. Your body is the boss.',
  whatsappNumber: '918305213300',
  callNumber: '918305213300',
  address: '2nd Floor, BM-125, Main Road, Near Sai Mandir, Nehru Nagar, Bhopal, Madhya Pradesh 462003',
  // Keyless Google Maps embed — pins the gym's location without an API key.
  googleMapsUrl:
    'https://www.google.com/maps?q=Supermen+fitness+gym,+Nehru+Nagar,+Bhopal+462003&output=embed',
  openHours: 'Mon – Sat: 6:00 AM – 10:00 PM · Sunday Closed',
  heroVideoUrl: '',
};

// Contact email shown in the footer. Set to '' to hide.
export const CONTACT_EMAIL: string = '';

// Social links. Leave a URL empty ('') to hide that icon in the footer.
export const SOCIALS: { instagram: string; facebook: string; twitter: string; youtube: string } = {
  instagram: 'https://www.instagram.com/supermen_fitness',
  facebook: '',
  twitter: '',
  youtube: '',
};
