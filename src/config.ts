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
  /**
   * Hero background photos. These live in public/, so the paths are
   * root-absolute. Two crops are used: a wide one for desktop and a portrait
   * one for phones, chosen by a <picture> media query in Hero.tsx.
   * Both are overridden by Hero Background Image in Admin -> General Settings.
   */
  heroImage: '/assets/background1.webp',
  heroImageMobile: '/assets/phonebackground1.webp',
};

// Contact email shown in the footer. Set to '' to hide.
export const CONTACT_EMAIL: string = '';

/**
 * Social links shown in the footer.
 *
 * An empty string ('') does NOT hide the icon — it renders dimmed and
 * non-clickable, so the row still shows every platform the gym plans to be on.
 * Paste a real URL here and that icon becomes a live link automatically.
 *
 * WhatsApp is not listed: it is built from DEFAULTS.whatsappNumber (or the
 * WhatsApp Link set in Admin -> General Settings) so there is one number to
 * maintain, not two.
 */
export const SOCIALS: { instagram: string; facebook: string; youtube: string } = {
  instagram: 'https://www.instagram.com/supermen_fitness',
  facebook: '',
  youtube: '',
};
