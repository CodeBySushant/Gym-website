/**
 * Supermen Fitness Gym — Backend API
 * Express + MongoDB + JWT auth + local image uploads.
 * Replaces Firebase entirely.
 */
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { createMemberRoutes } from './members.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ------------------------- Config -------------------------
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';
const JWT_SECRET = process.env.JWT_SECRET || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'mesushant.official@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

if (!ADMIN_PASSWORD) {
  console.error('\n[FATAL] ADMIN_PASSWORD is not set. Copy server/.env.example to server/.env and set it.\n');
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error('\n[FATAL] JWT_SECRET is not set. Copy server/.env.example to server/.env and set a long random string.\n');
  process.exit(1);
}
const ADMIN_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

// ------------------------- Database -------------------------
let dbReady = false;
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    dbReady = true;
    console.log('[db] Connected to MongoDB');
  })
  .catch((err) => {
    console.error('[db] MongoDB connection failed:', err.message);
    console.error('[db] The API will return 503 for data routes until the database is reachable.');
  });
mongoose.connection.on('connected', () => (dbReady = true));
mongoose.connection.on('disconnected', () => (dbReady = false));

const CONTENT_COLLECTIONS = ['services', 'trainers', 'testimonials', 'gallery', 'pricing', 'health_tips', 'faqs'];

function looseSchema() {
  const schema = new mongoose.Schema({}, { strict: false, versionKey: false });
  schema.set('toJSON', {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      return ret;
    },
  });
  return schema;
}

const models = {};
for (const c of CONTENT_COLLECTIONS) models[c] = mongoose.model(c, looseSchema(), c);
models.settings = mongoose.model('settings', looseSchema(), 'settings');
models.leads = mongoose.model('leads', looseSchema(), 'leads');

/** Strip Mongo operator injection: removes keys starting with $ or containing dots. */
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

// ------------------------- App -------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const requireDb = (_req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database unavailable. Is MongoDB running?' });
  next();
};

// ------------------------- Image uploads (shared by admin + members) -------------------------
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safe}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ------------------------- Auth -------------------------
function signToken() {
  return jwt.sign({ email: ADMIN_EMAIL, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('not admin');
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

// Member portal routes (member auth + admin member management).
const { router: memberRouter, makeRateLimit } = createMemberRoutes({
  JWT_SECRET,
  requireDb,
  requireAdmin,
  sanitize,
  upload,
});
app.use('/api', memberRouter);

// Brute-force guard on the admin login. Without this a single admin account
// can be guessed at indefinitely.
const adminLoginLimit = makeRateLimit({
  max: 8,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

app.post('/api/auth/login', adminLoginLimit, (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const ok = email.trim().toLowerCase() === ADMIN_EMAIL && bcrypt.compareSync(password, ADMIN_HASH);
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
  res.json({
    token: signToken(),
    user: { uid: 'admin', email: ADMIN_EMAIL, displayName: ADMIN_EMAIL.split('@')[0], role: 'admin' },
  });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ uid: 'admin', email: req.admin.email, displayName: req.admin.email.split('@')[0], role: 'admin' });
});

// ------------------------- Content (public read, admin write) -------------------------
function contentModel(req, res) {
  const col = req.params.col;
  if (!CONTENT_COLLECTIONS.includes(col)) {
    res.status(404).json({ error: 'Unknown collection' });
    return null;
  }
  return models[col];
}

app.get('/api/content/:col', requireDb, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    const filter = {};
    if (req.query.category) filter.category = String(req.query.category);
    const sortField = ['order', 'createdAt'].includes(String(req.query.orderBy)) ? String(req.query.orderBy) : 'order';
    const dir = req.query.dir === 'desc' ? -1 : 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
    const rows = await Model.find(filter).sort({ [sortField]: dir }).limit(limit);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/content/:col', requireDb, requireAdmin, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    const row = await Model.create(sanitize(req.body));
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/content/:col/:id', requireDb, requireAdmin, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    const row = await Model.findByIdAndUpdate(req.params.id, { $set: sanitize(req.body) }, { new: true });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/content/:col/:id', requireDb, requireAdmin, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------- Settings (single document) -------------------------
app.get('/api/settings', requireDb, async (_req, res) => {
  try {
    const row = await models.settings.findOne();
    res.json(row || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/settings', requireDb, requireAdmin, async (req, res) => {
  try {
    const row = await models.settings.findOneAndUpdate(
      {},
      { $set: sanitize(req.body) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ------------------------- Leads (public create, admin manage) -------------------------
// Simple in-memory rate limit: max 5 lead submissions per IP per hour.
const leadHits = new Map();
function leadRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const now = Date.now();
  const hits = (leadHits.get(ip) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (hits.length >= 5) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  hits.push(now);
  leadHits.set(ip, hits);
  next();
}

app.post('/api/leads', requireDb, leadRateLimit, async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!name || name.length > 100) return res.status(400).json({ error: 'Please provide a valid name' });
    if (phone.length < 10 || phone.length > 15) {
      return res.status(400).json({ error: 'Please provide a valid phone number (10-15 digits)' });
    }
    const row = await models.leads.create({ name, phone, status: 'new', createdAt: new Date() });
    res.status(201).json({ id: row.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/leads', requireDb, requireAdmin, async (_req, res) => {
  try {
    const rows = await models.leads.find().sort({ createdAt: -1 }).limit(500);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/leads/:id', requireDb, requireAdmin, async (req, res) => {
  try {
    const allowed = {};
    if (['new', 'contacted', 'confirmed', 'cancelled'].includes(req.body?.status)) allowed.status = req.body.status;
    const row = await models.leads.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/leads/:id', requireDb, requireAdmin, async (req, res) => {
  try {
    await models.leads.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));

// ------------------------- Serve frontend in production -------------------------
const distDir = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
  console.log(`[server] Admin: ${ADMIN_EMAIL}`);
});
