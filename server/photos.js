/**
 * Photo audit + bulk import.
 *
 *   node server/photos.js            # what is still a stock photo?
 *   node server/photos.js --list     # what should the gym name their files?
 *   node server/photos.js --import   # swap in everything from server/real-photos/
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm run seed` fills the site with Unsplash stock photos so it looks complete
 * on day one. Twenty-one of them. Every single one has to be replaced with the
 * gym's real photos before launch, and doing that through the admin panel means
 * twenty-one upload dialogs — easy to lose track of, easy to ship with a photo
 * of someone else's gym still on the page.
 *
 * HOW TO USE IT
 * -------------
 * 1. Run `node server/photos.js --list` and send that output to the gym.
 * 2. They send photos back. Drop them into server/real-photos/<folder>/,
 *    named as the list says.
 * 3. Run `node server/photos.js --import`.
 * 4. Run `node server/photos.js` again — it should report zero stock photos.
 *
 * Files are copied into server/uploads/ using the same naming scheme multer
 * uses, so they are served at /uploads/... exactly like an admin upload.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const SOURCE_DIR = path.join(__dirname, 'real-photos');
const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];

/**
 * Which collections hold photos, which field the URL lives in, and which field
 * identifies the row to a human. Gallery is the odd one out: its URL field is
 * `url`, and its items have captions rather than titles, so it matches on the
 * `order` number instead.
 */
const TARGETS = [
  { collection: 'services', folder: 'services', urlField: 'imageUrl', labelField: 'title' },
  { collection: 'trainers', folder: 'trainers', urlField: 'imageUrl', labelField: 'name' },
  { collection: 'testimonials', folder: 'testimonials', urlField: 'imageUrl', labelField: 'name' },
  { collection: 'health_tips', folder: 'health-tips', urlField: 'imageUrl', labelField: 'title' },
  { collection: 'gallery', folder: 'gallery', urlField: 'url', labelField: 'caption', matchByOrder: true },
];

const loose = () => new mongoose.Schema({}, { strict: false, versionKey: false });
const model = (n) => mongoose.models[n] || mongoose.model(n, loose(), n);

/** "Free Weights Zone" -> "free-weights-zone" */
const slug = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** A remote URL means it is still stock; /uploads/... means it is the gym's own. */
const isStock = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);

// ============================ AUDIT ============================
async function audit() {
  let stock = 0;
  let real = 0;
  let missing = 0;

  console.log('\n  PHOTO AUDIT\n  ' + '='.repeat(58));

  for (const t of TARGETS) {
    const rows = await model(t.collection).find().sort({ order: 1 });
    if (!rows.length) continue;

    console.log(`\n  ${t.collection.toUpperCase().replace(/_/g, ' ')}`);
    for (const r of rows) {
      const url = r[t.urlField];
      const label = r[t.labelField] || `(item ${r.order ?? '?'})`;
      if (!url) {
        missing += 1;
        console.log(`    [ no image ] ${label}`);
      } else if (isStock(url)) {
        stock += 1;
        console.log(`    [  STOCK   ] ${label}`);
      } else {
        real += 1;
        console.log(`    [   real   ] ${label}`);
      }
    }
  }

  // The hero background is a bundled file, not a database row, unless the
  // admin has uploaded a replacement.
  const settings = await model('settings').findOne();
  const hero = settings?.heroImageUrl;
  console.log('\n  HERO BACKGROUND');
  console.log(
    hero
      ? `    [ ${isStock(hero) ? ' STOCK   ' : '  real   '} ] admin upload: ${hero}`
      : '    [ bundled  ] using public/assets/background1.webp'
  );

  console.log('\n  ' + '='.repeat(58));
  console.log(`  ${real} real · ${stock} stock · ${missing} missing`);
  if (stock > 0) {
    console.log(`\n  ${stock} stock photo${stock === 1 ? '' : 's'} still live on the site.`);
    console.log('  Run `node server/photos.js --list` to see what to ask the gym for.\n');
  } else {
    console.log('\n  No stock photos left. Safe to launch on this front.\n');
  }
}

// ============================ LIST ============================
async function list() {
  console.log('\n  PHOTOS NEEDED FROM THE GYM\n  ' + '='.repeat(58));
  console.log('\n  Save each photo with the exact filename below (.jpg or .png),');
  console.log('  into the matching folder, then run: node server/photos.js --import\n');

  for (const t of TARGETS) {
    const rows = await model(t.collection).find().sort({ order: 1 });
    const pending = rows.filter((r) => !r[t.urlField] || isStock(r[t.urlField]));
    if (!pending.length) continue;

    console.log(`  server/real-photos/${t.folder}/`);
    for (const r of pending) {
      const name = t.matchByOrder ? String(r.order ?? '') : slug(r[t.labelField]);
      const label = r[t.labelField] || `item ${r.order ?? '?'}`;
      console.log(`    ${(name + '.jpg').padEnd(38)} ->  ${label}`);
    }
    console.log('');
  }

  console.log('  server/real-photos/hero/');
  console.log('    hero.jpg                               ->  Homepage background');
  console.log('       Landscape, subject on the RIGHT — the headline sits on the left.\n');
}

// ============================ IMPORT ============================
function readFolder(folder) {
  const dir = path.join(SOURCE_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
    .map((f) => ({ file: f, full: path.join(dir, f), key: slug(path.parse(f).name) }));
}

/** Copies into uploads/ with multer's naming scheme and returns the public URL. */
function publish(sourcePath, originalName) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `${Date.now()}_${safe}`;
  fs.copyFileSync(sourcePath, path.join(UPLOADS_DIR, filename));
  return `/uploads/${filename}`;
}

async function importPhotos() {
  if (!fs.existsSync(SOURCE_DIR)) {
    fs.mkdirSync(SOURCE_DIR, { recursive: true });
    for (const t of TARGETS) fs.mkdirSync(path.join(SOURCE_DIR, t.folder), { recursive: true });
    fs.mkdirSync(path.join(SOURCE_DIR, 'hero'), { recursive: true });
    console.log('\n  Created server/real-photos/ with a folder per section.');
    console.log('  Drop the gym\'s photos in, then run this again.\n');
    return;
  }

  let updated = 0;
  const unmatched = [];

  console.log('\n  IMPORTING PHOTOS\n  ' + '='.repeat(58) + '\n');

  for (const t of TARGETS) {
    const files = readFolder(t.folder);
    if (!files.length) continue;

    const Model = model(t.collection);
    const rows = await Model.find().sort({ order: 1 });

    for (const f of files) {
      // Allow a "01-" ordering prefix on filenames without breaking the match.
      const key = f.key.replace(/^\d+-/, '');
      const row = rows.find((r) =>
        t.matchByOrder
          ? String(r.order) === key || slug(r[t.labelField]) === key
          : slug(r[t.labelField]) === key
      );

      if (!row) {
        unmatched.push(`${t.folder}/${f.file}`);
        continue;
      }

      const url = publish(f.full, f.file);
      await Model.updateOne({ _id: row._id }, { $set: { [t.urlField]: url } });
      updated += 1;
      console.log(`    ${t.collection.padEnd(14)} ${String(row[t.labelField] || row.order).padEnd(30)} <- ${f.file}`);
    }
  }

  // Hero background lives on the settings document.
  const heroFiles = readFolder('hero');
  if (heroFiles.length) {
    const url = publish(heroFiles[0].full, heroFiles[0].file);
    await model('settings').findOneAndUpdate({}, { $set: { heroImageUrl: url } }, { upsert: true });
    updated += 1;
    console.log(`    ${'hero'.padEnd(14)} ${'Homepage background'.padEnd(30)} <- ${heroFiles[0].file}`);
  }

  console.log('\n  ' + '='.repeat(58));
  console.log(`  ${updated} photo${updated === 1 ? '' : 's'} imported.`);

  if (unmatched.length) {
    console.log(`\n  ${unmatched.length} file${unmatched.length === 1 ? '' : 's'} did not match any item:`);
    for (const u of unmatched) console.log(`    ${u}`);
    console.log('  Check the names against `node server/photos.js --list`.');
  }
  console.log('');
}

// ============================ RUN ============================
async function main() {
  await mongoose.connect(MONGODB_URI);
  const mode = process.argv[2];

  if (mode === '--import') await importPhotos();
  else if (mode === '--list') await list();
  else await audit();

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[photos] Failed:', err.message);
  process.exit(1);
});
