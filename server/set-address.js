/**
 * One-off fix: writes the gym's real address into the settings document.
 *
 *   node server/set-address.js
 *
 * Why this exists: Contact.tsx and Footer.tsx read `settings.address` from
 * MongoDB and only fall back to src/config.ts when the database has no value.
 * So editing config.ts alone will NOT change a site whose settings document
 * already holds an old address — this script overwrites it directly.
 *
 * Equivalent to opening Admin -> General Settings and editing the Address and
 * Maps Embed URL fields by hand. Safe to re-run.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';

const ADDRESS =
  '2nd Floor, BM-125, Main Road, Near Sai Mandir, Nehru Nagar, Bhopal, Madhya Pradesh 462003';

// Keyless embed — pins the gym without needing a Google Maps API key.
const MAPS_URL =
  'https://www.google.com/maps?q=Supermen+fitness+gym,+Nehru+Nagar,+Bhopal+462003&output=embed';

async function main() {
  console.log('[address] Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const Settings =
    mongoose.models.settings ||
    mongoose.model('settings', new mongoose.Schema({}, { strict: false, versionKey: false }), 'settings');

  const before = await Settings.findOne();
  console.log('[address] Current address :', before?.address || '(nothing saved yet)');
  console.log('[address] Current map URL :', before?.googleMapsUrl || '(nothing saved yet)');

  await Settings.findOneAndUpdate(
    {},
    { $set: { address: ADDRESS, googleMapsUrl: MAPS_URL } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('\n[address] Updated address :', ADDRESS);
  console.log('[address] Updated map URL :', MAPS_URL);
  console.log('\n[address] Done. Reload the site — the footer, contact card and map will show the new address.');
  console.log('[address] Tip: the public site caches settings in localStorage, so do one hard refresh (Ctrl+Shift+R).');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[address] Failed:', err.message);
  process.exit(1);
});
