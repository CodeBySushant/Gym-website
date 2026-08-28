/**
 * Replaces the seeded "Priya Sharma" trainer with the gym's actual owner.
 *
 *   node server/set-owner.js
 *
 * WHY A SCRIPT
 * ------------
 * Trainers live in MongoDB, not in the code. Editing seed.js alone changes
 * nothing on a running site, because seed.js skips any collection that already
 * has documents. This writes to the live record. Safe to re-run.
 *
 * BEFORE RUNNING: fill in the OWNER block below with Ankit's real details.
 * The script refuses to run while the placeholders are still there — a bio
 * invented by software has no business on a real person's business page.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';

// ============================ FILL THIS IN ============================

const OWNER = {
  name: 'Ankit Giri',

  // Shown under his name on the card. Keep it short — 2 to 4 words.
  specialization: 'Founder & Head Coach',

  // 1-2 sentences in his voice. What he coaches, who he works with, why he
  // opened the gym. Do NOT publish invented certifications or years.
  bio: 'REPLACE ME — Ankit\'s own description of what he coaches and who he trains.',

  // A single line he actually says to members.
  quote: 'REPLACE ME — a line in his own words.',

  // Prefers the converted webp when present, falls back to the PNG.
  imageUrl: fs.existsSync(path.join(__dirname, '..', 'public', 'assets', 'owner.webp'))
    ? '/assets/owner.webp'
    : '/assets/owner.png',

  // 1 puts the owner first in the Trainers section. Change to 2 to keep him
  // in the slot Priya Sharma occupied.
  order: 1,
};

// Who he replaces. Matched by name so re-running is harmless.
const REPLACES = 'Priya Sharma';

// ======================================================================

const looseSchema = () => new mongoose.Schema({}, { strict: false, versionKey: false });
const Trainer = mongoose.models.trainers || mongoose.model('trainers', looseSchema(), 'trainers');

function checkPlaceholders() {
  const unfilled = Object.entries(OWNER)
    .filter(([, v]) => typeof v === 'string' && v.includes('REPLACE ME'))
    .map(([k]) => k);

  if (unfilled.length && !process.argv.includes('--force')) {
    console.error('\n  Not writing — these fields are still placeholders:\n');
    for (const f of unfilled) console.error(`    ${f}`);
    console.error('\n  Open server/set-owner.js and fill in the OWNER block with Ankit\'s');
    console.error('  real details, then run this again.');
    console.error('  (--force writes anyway, if you want to fix the text in the admin panel.)\n');
    process.exit(1);
  }
}

async function main() {
  checkPlaceholders();

  await mongoose.connect(MONGODB_URI);

  const imagePath = path.join(__dirname, '..', 'public', OWNER.imageUrl.replace(/^\//, ''));
  if (!fs.existsSync(imagePath)) {
    console.warn(`\n  Warning: ${OWNER.imageUrl} not found at ${imagePath}`);
    console.warn('  The card will render with a broken image until the file is there.\n');
  }

  const existing = await Trainer.findOne({ name: OWNER.name });
  const outgoing = await Trainer.findOne({ name: REPLACES });

  if (existing) {
    await Trainer.updateOne({ _id: existing._id }, { $set: OWNER });
    console.log(`\n  Updated existing trainer: ${OWNER.name}`);
  } else if (outgoing) {
    await Trainer.updateOne({ _id: outgoing._id }, { $set: OWNER });
    console.log(`\n  Replaced ${REPLACES} with ${OWNER.name}`);
  } else {
    await Trainer.create(OWNER);
    console.log(`\n  ${REPLACES} not found — added ${OWNER.name} as a new trainer`);
  }

  // Push everyone else down so the owner keeps the slot he was given.
  if (OWNER.order === 1) {
    const others = await Trainer.find({ name: { $ne: OWNER.name } }).sort({ order: 1 });
    let next = 2;
    for (const t of others) {
      await Trainer.updateOne({ _id: t._id }, { $set: { order: next } });
      next += 1;
    }
  }

  const all = await Trainer.find().sort({ order: 1 });
  console.log('\n  Trainers section now reads:\n');
  for (const t of all) {
    const flag = t.name === OWNER.name ? ' <-- owner' : '';
    console.log(`    ${t.order}. ${t.name} — ${t.specialization}${flag}`);
    console.log(`       image: ${t.imageUrl}`);
  }
  console.log('\n  Hard refresh the site (Ctrl+Shift+R) — the public page caches content.\n');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('[set-owner] Failed:', err.message);
  process.exit(1);
});
