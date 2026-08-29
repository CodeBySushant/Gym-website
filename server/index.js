/**
 * Supermen Fitness Gym — Backend API
 * Express + MongoDB + JWT auth + local image uploads.
 * Replaces Firebase entirely.
 */
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
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

/**
 * H-01. The login limiter used to key on req.headers['x-forwarded-for'], a
 * header any client can set — so its 8-attempts-per-15-minutes cap could be
 * skipped by sending a different value each request. Express only resolves a
 * trustworthy req.ip once it knows how many proxies sit in front of it.
 *
 * Default 0 = trust nothing, req.ip is the raw socket address (correct for
 * local dev and for a directly-exposed server). Behind nginx or a single load
 * balancer, set TRUST_PROXY=1. Never set it to `true`: that trusts the whole
 * forwarded chain and reintroduces the spoof.
 */
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);

// H-04. No security headers existed at all. The CSP is what stops an injected
// script from running even if a dangerous file reaches the browser.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    reportOnly: process.env.CSP_REPORT_ONLY === 'true',
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      // Tailwind and motion/react both write inline style attributes.
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://images.unsplash.com'],
      connectSrc: ["'self'"],
      // Google Maps embed + the gallery's YouTube / Vimeo players.
      frameSrc: ['https://www.google.com', 'https://www.youtube.com', 'https://player.vimeo.com'],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by');

// L-01. Lock the API to the site's own origin in production. Comma-separated
// list, e.g. CORS_ORIGIN=https://supermenfitness.com
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : true; // dev: reflect the requesting origin
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

/**
 * M-05. Handlers used to return e.message straight to the client, leaking
 * Mongoose schema details and internal paths on routes that are reachable
 * without authentication. The operator keeps the detail; the caller gets a
 * reference they can quote when reporting the problem.
 */
function fail(res, error, status = 500) {
  const ref = crypto.randomBytes(4).toString('hex');
  console.error(`[error ${ref}]`, error);
  res.status(status).json({ error: `Something went wrong. Reference: ${ref}` });
}

const requireDb = (_req, res, next) => {
  if (!dbReady) return res.status(503).json({ error: 'Database unavailable. Is MongoDB running?' });
  next();
};

// ------------------------- Image uploads (shared by admin + members) -------------------------
/**
 * Where uploaded images live. Defaults to server/uploads, which is fine
 * locally but is WIPED ON EVERY REDEPLOY on hosts with ephemeral disks
 * (Render free tier, Railway without a volume). Point UPLOADS_DIR at a mounted
 * persistent volume in production so the gym's photos survive a restart.
 */
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, 'uploads');

/**
 * H-02. Member progress photos are body-composition photographs. They used to
 * land in the same directory as marketing images and were served to anyone who
 * knew the URL. They now live OUTSIDE the statically served directory and are
 * only reachable through a short-lived signed link (see members.js).
 */
const privateDir = process.env.PRIVATE_UPLOADS_DIR
  ? path.resolve(process.env.PRIVATE_UPLOADS_DIR)
  : path.join(path.dirname(uploadsDir), 'private-uploads');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(privateDir, { recursive: true });

/**
 * C-01. The old filter tested file.mimetype — a value copied verbatim from the
 * request — and then kept the caller's own filename, extension included. So a
 * file announced as image/png but named payload.svg was accepted and later
 * served as image/svg+xml, which executes script on this origin.
 *
 * The extension is now chosen by the server from this map, never by the
 * uploader, and the filename is a UUID. SVG is deliberately absent: it is an
 * XML format that legitimately carries <script>, so it can never be served
 * inline from a trusted origin.
 */
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

function makeUploader(destination) {
  return multer({
    storage: multer.diskStorage({
      destination,
      filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED_IMAGE_TYPES.get(file.mimetype)}`),
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
      ALLOWED_IMAGE_TYPES.has(file.mimetype)
        ? cb(null, true)
        : cb(new Error('Only JPEG, PNG and WebP images are allowed')),
  });
}

const upload = makeUploader(uploadsDir);        // public marketing images
const uploadPrivate = makeUploader(privateDir); // member progress photos

/**
 * Target frame per section, matching the aspect ratio each card actually
 * renders at. Uploads are cropped to these, so a square photo, a landscape
 * shot and a phone portrait all end up the same shape and rows stay even.
 *
 * `position: 'attention'` keeps the busiest region rather than the geometric
 * centre — for a photo of a person that is almost always their face.
 * `progress` deliberately has no height: body photos get resized and stripped
 * but never cropped, since trimming someone's progress photo defeats its point.
 */
const IMAGE_PRESETS = {
  trainer: { width: 900, height: 1200, position: 'attention' },  // 3:4
  service: { width: 1200, height: 900, position: 'attention' },  // 4:3
  gallery: { width: 1600, height: 900, position: 'attention' },  // 16:9
  tip: { width: 1200, height: 750, position: 'attention' },      // 16:10
  member: { width: 600, height: 600, position: 'attention' },    // 1:1
  hero: { width: 1920, height: 1080, position: 'attention' },    // 16:9
  progress: { width: 1400, height: null, position: 'centre' },   // resize only
  default: { width: 1600, height: null, position: 'centre' },
};

/**
 * Re-encodes an upload to WebP at its preset size, replacing the original.
 * Three things follow beyond consistent framing: files shrink by roughly an
 * order of magnitude, EXIF is dropped (phone photos carry GPS coordinates),
 * and anything non-image that got past the MIME filter fails to decode here.
 */
async function normalizeImage(filePath, presetName) {
  const preset = IMAGE_PRESETS[presetName] || IMAGE_PRESETS.default;
  const output = filePath.replace(/\.[^.]+$/, '.webp');

  await sharp(filePath)
    .rotate() // honour EXIF orientation before stripping it
    .resize({
      width: preset.width,
      height: preset.height || undefined,
      fit: preset.height ? 'cover' : 'inside',
      position: preset.position,
      withoutEnlargement: !preset.height,
    })
    .webp({ quality: 82 })
    .toFile(output);

  if (output !== filePath) await fs.promises.unlink(filePath).catch(() => {});
  return path.basename(output);
}

/**
 * Health check + proxy diagnostic.
 *
 * `ip` is the important field when the frontend sits behind a proxy. Every
 * request then arrives from the proxy's edge, so if TRUST_PROXY is set too low
 * the rate limiters bucket ALL visitors together — one person's failed logins
 * would lock out the gym owner, and the 5-per-hour lead limit would apply
 * across the whole site rather than per visitor.
 *
 * Open this in a browser after deploying. If `ip` is your own address, the
 * setting is right. If it is a datacentre address, raise TRUST_PROXY by one
 * and check again.
 */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    ip: req.ip,
    trustProxy: app.get('trust proxy'),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
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
  uploadPrivate,
  privateDir,
  normalizeImage,
  fail,
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
    fail(res, e);
  }
});

app.post('/api/content/:col', requireDb, requireAdmin, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    const row = await Model.create(sanitize(req.body));
    res.status(201).json(row);
  } catch (e) {
    fail(res, e);
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
    fail(res, e);
  }
});

app.delete('/api/content/:col/:id', requireDb, requireAdmin, async (req, res) => {
  const Model = contentModel(req, res);
  if (!Model) return;
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
});

// ------------------------- Settings (single document) -------------------------
app.get('/api/settings', requireDb, async (_req, res) => {
  try {
    const row = await models.settings.findOne();
    res.json(row || null);
  } catch (e) {
    fail(res, e);
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
    fail(res, e);
  }
});

// ------------------------- Leads (public create, admin manage) -------------------------
// Max 5 lead submissions per IP per hour. Uses the shared limiter from
// members.js rather than a second hand-rolled Map — that one never pruned
// itself, so it grew by one entry per visiting IP for the life of the process.
const leadRateLimit = makeRateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests. Please try again later.',
});

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
    fail(res, e);
  }
});

app.get('/api/leads', requireDb, requireAdmin, async (_req, res) => {
  try {
    const rows = await models.leads.find().sort({ createdAt: -1 }).limit(500);
    res.json(rows);
  } catch (e) {
    fail(res, e);
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
    fail(res, e);
  }
});

app.delete('/api/leads/:id', requireDb, requireAdmin, async (req, res) => {
  try {
    await models.leads.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    fail(res, e);
  }
});

app.post('/api/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    try {
      const filename = await normalizeImage(req.file.path, req.body?.preset);
      res.json({ url: `/uploads/${filename}` });
    } catch (e) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      console.error('[upload] Could not process image', e);
      res.status(400).json({ error: 'That file could not be read as an image.' });
    }
  });
});

app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  setHeaders: (res) => {
    // Even if a dangerous file somehow lands here, nosniff stops the browser
    // second-guessing the type and the per-response CSP kills inline script.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
  },
}));

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
  console.log(`[server] Timezone: ${process.env.GYM_TIMEZONE || 'Asia/Kolkata'}`);
  console.log(`[server] Uploads: ${uploadsDir}`);
  console.log(`[server] Private uploads: ${privateDir}`);
  console.log(`[server] Trust proxy: ${app.get('trust proxy')}`);
  if (process.env.NODE_ENV === 'production' && !process.env.UPLOADS_DIR) {
    console.warn(
      '[server] WARNING: UPLOADS_DIR is not set, so uploads go inside the app directory.\n' +
      '[server]          On a host with an ephemeral disk every redeploy deletes them.\n' +
      '[server]          Mount a persistent volume and set UPLOADS_DIR to its path.'
    );
  }
});
