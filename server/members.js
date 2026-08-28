/**
 * Supermen Fitness Gym — Member Portal API
 *
 * Everything a logged-in member can see about themselves, plus the admin-side
 * routes for managing members, attendance, payments and plans.
 *
 * SECURITY MODEL
 * --------------
 * Member routes NEVER take a member id from the request. The id always comes
 * from the verified JWT (`req.member.id`), so one member can never read or
 * write another member's data by changing a URL or a body field.
 */
import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const { Schema, Types } = mongoose;

// ------------------------- Models -------------------------
function looseSchema(indexes = {}) {
  const schema = new Schema({}, { strict: false, versionKey: false });
  if (Object.keys(indexes).length) schema.index(indexes);
  schema.set('toJSON', {
    transform: (_doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.passwordHash; // never leaks, on any route
      return ret;
    },
  });
  return schema;
}

const M = {
  members: mongoose.model('members', looseSchema({ phone: 1 }), 'members'),
  attendance: mongoose.model('attendance', looseSchema({ memberId: 1, date: -1 }), 'attendance'),
  payments: mongoose.model('payments', looseSchema({ memberId: 1, date: -1 }), 'payments'),
  workout_plans: mongoose.model('workout_plans', looseSchema({ memberId: 1 }), 'workout_plans'),
  diet_plans: mongoose.model('diet_plans', looseSchema({ memberId: 1 }), 'diet_plans'),
  measurements: mongoose.model('measurements', looseSchema({ memberId: 1, date: -1 }), 'measurements'),
  workout_logs: mongoose.model('workout_logs', looseSchema({ memberId: 1, date: -1 }), 'workout_logs'),
  progress_photos: mongoose.model('progress_photos', looseSchema({ memberId: 1, date: -1 }), 'progress_photos'),
  classes: mongoose.model('classes', looseSchema(), 'classes'),
  class_bookings: mongoose.model('class_bookings', looseSchema({ memberId: 1 }), 'class_bookings'),
  pt_sessions: mongoose.model('pt_sessions', looseSchema({ memberId: 1, date: 1 }), 'pt_sessions'),
  renewal_requests: mongoose.model('renewal_requests', looseSchema({ memberId: 1 }), 'renewal_requests'),
};

// ------------------------- Helpers -------------------------
const digits = (v) => String(v || '').replace(/\D/g, '');
const isValidId = (v) => Types.ObjectId.isValid(String(v));

// ------------------------- Dates, in the gym's timezone -------------------------
/**
 * Every "what day is it" question below used to be answered with the server's
 * own local time. That is correct on a laptop in Bhopal and wrong the moment
 * this is deployed to a host running UTC: at 5 AM IST the server still thinks
 * it is yesterday, so a check-in lands on the wrong day, streaks break, and a
 * membership expires a day early.
 *
 * Everything now resolves against GYM_TIMEZONE instead of the process clock.
 */
const TZ = process.env.GYM_TIMEZONE || 'Asia/Kolkata';

const DAY_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
});

/** The calendar date at that instant in the gym's timezone, as 'YYYY-MM-DD'. */
function dayKey(dateish) {
  const d = dateish ? new Date(dateish) : new Date();
  if (Number.isNaN(d.getTime())) return null;
  return DAY_FMT.format(d); // en-CA formats as YYYY-MM-DD
}

/** The day before a 'YYYY-MM-DD' key. Used to walk an attendance streak back. */
function previousDay(key) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Milliseconds to add to a UTC instant to get the gym's wall-clock time. */
function tzOffsetMs(instant) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  // hour can come back as 24 for midnight depending on the ICU build.
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - instant.getTime();
}

/**
 * The [start, end) UTC instants covering one calendar day in the gym's
 * timezone — what Mongo range queries need. India has no DST, so a flat 24h
 * span is exact here; a DST zone would drift by an hour twice a year.
 */
function dayRange(dateish) {
  const midnightUtc = new Date(`${dayKey(dateish)}T00:00:00Z`);
  const approx = new Date(midnightUtc.getTime() - tzOffsetMs(midnightUtc));
  const start = new Date(midnightUtc.getTime() - tzOffsetMs(approx));
  return { start, end: new Date(start.getTime() + 86400000) };
}

/** Days until a plan expires. Negative means already expired. */
function daysUntil(dateish) {
  if (!dateish) return null;
  const end = dayKey(dateish);
  if (!end) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${dayKey()}T00:00:00Z`)) / 86400000);
}

/** Derived status so the frontend never has to compute it. */
function membershipStatus(member) {
  if (member?.frozen) return 'frozen';
  const left = daysUntil(member?.planExpiry);
  if (left === null) return 'none';
  if (left < 0) return 'expired';
  if (left <= 7) return 'expiring';
  return 'active';
}

/** Attendance streak + this-month count, computed from raw attendance rows. */
function attendanceSummary(rows) {
  const days = new Set(rows.map((r) => dayKey(r.date)));
  let streak = 0;
  let cursor = dayKey();
  // Today not yet visited shouldn't break a streak that ran through yesterday.
  if (!days.has(cursor)) cursor = previousDay(cursor);
  while (days.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  const thisMonthKey = dayKey().slice(0, 7); // 'YYYY-MM'
  const thisMonth = rows.filter((r) => dayKey(r.date)?.startsWith(thisMonthKey)).length;
  return { total: rows.length, thisMonth, streak };
}

async function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const count = await M.payments.countDocuments({ invoiceNo: { $regex: `^INV-${year}-` } });
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

/** Fixed-window limiter, keyed by IP. Protects both login routes from guessing. */
function makeRateLimit({ max, windowMs, message }) {
  const hits = new Map();

  // Without this the map keeps one entry per IP that ever hit the route, for
  // the life of the process — a slow leak on a server that stays up for months.
  // unref() means the timer never keeps the process alive on its own.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, times] of hits) {
      const live = times.filter((t) => t > cutoff);
      if (live.length) hits.set(ip, live);
      else hits.delete(ip);
    }
  }, Math.max(windowMs, 60_000));
  if (typeof sweep.unref === 'function') sweep.unref();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: message });
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

// ------------------------- Router -------------------------
export function createMemberRoutes({ JWT_SECRET, requireDb, requireAdmin, sanitize, upload }) {
  const router = express.Router();

  function signMemberToken(member) {
    return jwt.sign({ sub: member.id || member._id.toString(), role: 'member' }, JWT_SECRET, { expiresIn: '30d' });
  }

  function requireMember(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload.role !== 'member') throw new Error('wrong role');
      req.member = { id: payload.sub };
      next();
    } catch {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
  }

  /** Loads the member row for the JWT subject; 401s if the account was deleted. */
  async function loadMember(req, res, next) {
    if (!isValidId(req.member.id)) return res.status(401).json({ error: 'Invalid session' });
    const member = await M.members.findById(req.member.id);
    if (!member) return res.status(401).json({ error: 'Account no longer exists' });
    req.memberDoc = member;
    next();
  }

  const memberOnly = [requireDb, requireMember, loadMember];
  const loginLimit = makeRateLimit({
    max: 8,
    windowMs: 15 * 60 * 1000,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  });

  // ===================== MEMBER AUTH =====================
  router.post('/member/auth/login', requireDb, loginLimit, async (req, res) => {
    try {
      const phone = digits(req.body?.phone);
      const password = String(req.body?.password || '');
      if (!phone || !password) return res.status(400).json({ error: 'Phone number and password are required' });

      const member = await M.members.findOne({ phone });
      // Same message either way — never reveal whether a phone is registered.
      const invalid = () => res.status(401).json({ error: 'Invalid phone number or password' });
      if (!member || !member.passwordHash) return invalid();
      if (!bcrypt.compareSync(password, member.passwordHash)) return invalid();
      if (member.active === false) {
        return res.status(403).json({ error: 'This account is inactive. Please contact the gym.' });
      }

      await M.members.updateOne({ _id: member._id }, { $set: { lastLoginAt: new Date() } });
      const json = member.toJSON();
      res.json({ token: signMemberToken(json), member: json });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/auth/me', ...memberOnly, (req, res) => {
    const m = req.memberDoc.toJSON();
    res.json({ ...m, status: membershipStatus(m), daysLeft: daysUntil(m.planExpiry) });
  });

  router.post('/member/auth/change-password', ...memberOnly, async (req, res) => {
    try {
      const current = String(req.body?.currentPassword || '');
      const next = String(req.body?.newPassword || '');
      if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
      if (!bcrypt.compareSync(current, req.memberDoc.passwordHash || '')) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      await M.members.updateOne(
        { _id: req.memberDoc._id },
        { $set: { passwordHash: bcrypt.hashSync(next, 10), mustChangePassword: false } }
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== MEMBER DASHBOARD =====================
  router.get('/member/overview', ...memberOnly, async (req, res) => {
    try {
      const id = req.memberDoc._id.toString();
      const m = req.memberDoc.toJSON();

      const [attendance, payments, measurements, ptSessions, workoutLogs] = await Promise.all([
        M.attendance.find({ memberId: id }).sort({ date: -1 }).limit(400),
        M.payments.find({ memberId: id }).sort({ date: -1 }).limit(50),
        M.measurements.find({ memberId: id }).sort({ date: -1 }).limit(24),
        M.pt_sessions.find({ memberId: id, status: { $ne: 'cancelled' } }).sort({ date: 1 }).limit(20),
        M.workout_logs.find({ memberId: id }).sort({ date: -1 }).limit(60),
      ]);

      let trainer = null;
      if (m.trainerId && isValidId(m.trainerId)) {
        const T = mongoose.models.trainers;
        if (T) trainer = await T.findById(m.trainerId);
      }

      const upcomingPt = ptSessions.filter((s) => new Date(s.date) >= dayRange(new Date()).start);
      const latest = measurements[0] || null;
      const previous = measurements[1] || null;

      res.json({
        member: m,
        status: membershipStatus(m),
        daysLeft: daysUntil(m.planExpiry),
        trainer: trainer ? trainer.toJSON() : null,
        attendance: attendanceSummary(attendance),
        lastPayment: payments[0] || null,
        totalPaid: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
        latestMeasurement: latest,
        weightChange: latest && previous ? Number(latest.weight) - Number(previous.weight) : null,
        upcomingPtCount: upcomingPt.length,
        nextPtSession: upcomingPt[0] || null,
        workoutsLogged: workoutLogs.length,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/attendance', ...memberOnly, async (req, res) => {
    try {
      const rows = await M.attendance.find({ memberId: req.memberDoc._id.toString() }).sort({ date: -1 }).limit(400);
      res.json({ rows, summary: attendanceSummary(rows) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/payments', ...memberOnly, async (req, res) => {
    try {
      const rows = await M.payments.find({ memberId: req.memberDoc._id.toString() }).sort({ date: -1 }).limit(200);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/workout-plan', ...memberOnly, async (req, res) => {
    try {
      const plan = await M.workout_plans.findOne({ memberId: req.memberDoc._id.toString() });
      const logs = await M.workout_logs.find({ memberId: req.memberDoc._id.toString() }).sort({ date: -1 }).limit(90);
      res.json({ plan, logs });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/member/workout-log', ...memberOnly, async (req, res) => {
    try {
      const memberId = req.memberDoc._id.toString();
      const day = String(req.body?.day || '').slice(0, 60);
      const date = req.body?.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date' });

      // One log per day per workout — toggling off removes it.
      const { start, end } = dayRange(date);
      const existing = await M.workout_logs.findOne({
        memberId,
        day,
        date: { $gte: start, $lt: end },
      });
      if (existing) {
        await M.workout_logs.deleteOne({ _id: existing._id });
        return res.json({ logged: false });
      }
      await M.workout_logs.create({ memberId, day, date, notes: String(req.body?.notes || '').slice(0, 500) });
      res.status(201).json({ logged: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/diet-plan', ...memberOnly, async (req, res) => {
    try {
      res.json(await M.diet_plans.findOne({ memberId: req.memberDoc._id.toString() }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/measurements', ...memberOnly, async (req, res) => {
    try {
      res.json(await M.measurements.find({ memberId: req.memberDoc._id.toString() }).sort({ date: 1 }).limit(200));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/member/measurements', ...memberOnly, async (req, res) => {
    try {
      const NUMERIC = ['weight', 'height', 'chest', 'waist', 'hips', 'arms', 'thighs', 'bodyFat'];
      const row = { memberId: req.memberDoc._id.toString(), date: new Date(), recordedBy: 'member' };
      for (const f of NUMERIC) {
        const v = Number(req.body?.[f]);
        if (Number.isFinite(v) && v > 0 && v < 1000) row[f] = v;
      }
      if (!row.weight) return res.status(400).json({ error: 'Weight is required' });
      res.status(201).json(await M.measurements.create(row));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/member/progress-photos', ...memberOnly, async (req, res) => {
    try {
      res.json(await M.progress_photos.find({ memberId: req.memberDoc._id.toString() }).sort({ date: -1 }).limit(200));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/member/progress-photos', ...memberOnly, async (req, res) => {
    try {
      const url = String(req.body?.url || '');
      if (!url.startsWith('/uploads/')) return res.status(400).json({ error: 'Invalid image' });
      const angle = ['front', 'side', 'back'].includes(req.body?.angle) ? req.body.angle : 'front';
      const row = await M.progress_photos.create({
        memberId: req.memberDoc._id.toString(),
        url,
        angle,
        caption: String(req.body?.caption || '').slice(0, 120),
        date: new Date(),
      });
      res.status(201).json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/member/progress-photos/:id', ...memberOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      // Scoped delete — a member can only ever remove their own photo.
      const result = await M.progress_photos.deleteOne({
        _id: req.params.id,
        memberId: req.memberDoc._id.toString(),
      });
      if (!result.deletedCount) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Member-scoped upload, so progress photos don't need the admin token. */
  router.post('/member/upload', requireDb, requireMember, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!req.file) return res.status(400).json({ error: 'No file provided' });
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });

  router.get('/member/schedule', ...memberOnly, async (req, res) => {
    try {
      const memberId = req.memberDoc._id.toString();
      const [classes, bookings, ptSessions] = await Promise.all([
        M.classes.find({ active: { $ne: false } }).sort({ order: 1 }).limit(60),
        M.class_bookings.find({ memberId }).limit(200),
        M.pt_sessions.find({ memberId }).sort({ date: 1 }).limit(60),
      ]);
      const bookedIds = new Set(bookings.map((b) => String(b.classId)));
      res.json({
        classes: classes.map((c) => ({ ...c.toJSON(), booked: bookedIds.has(c._id.toString()) })),
        ptSessions,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/member/classes/:id/book', ...memberOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid class' });
      const memberId = req.memberDoc._id.toString();
      const classId = req.params.id;
      const cls = await M.classes.findById(classId);
      if (!cls) return res.status(404).json({ error: 'Class not found' });

      const existing = await M.class_bookings.findOne({ memberId, classId });
      if (existing) {
        await M.class_bookings.deleteOne({ _id: existing._id });
        return res.json({ booked: false });
      }
      const capacity = Number(cls.capacity) || 0;
      if (capacity > 0 && (await M.class_bookings.countDocuments({ classId })) >= capacity) {
        return res.status(409).json({ error: 'This class is full' });
      }
      await M.class_bookings.create({ memberId, classId, createdAt: new Date() });
      res.status(201).json({ booked: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/member/renewal-request', ...memberOnly, async (req, res) => {
    try {
      const memberId = req.memberDoc._id.toString();
      const pending = await M.renewal_requests.findOne({ memberId, status: 'pending' });
      if (pending) return res.status(409).json({ error: 'You already have a renewal request pending.' });
      const row = await M.renewal_requests.create({
        memberId,
        memberName: req.memberDoc.name,
        memberPhone: req.memberDoc.phone,
        planName: String(req.body?.planName || '').slice(0, 80),
        note: String(req.body?.note || '').slice(0, 300),
        status: 'pending',
        createdAt: new Date(),
      });
      res.status(201).json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== ADMIN: MEMBERS =====================
  const adminOnly = [requireDb, requireAdmin];
  const MEMBER_FIELDS = [
    'name', 'phone', 'email', 'photoUrl', 'gender', 'dob', 'address',
    'planName', 'planStart', 'planExpiry', 'trainerId', 'emergencyContact',
    'notes', 'active', 'frozen',
  ];

  function pickMemberFields(body) {
    const out = {};
    for (const f of MEMBER_FIELDS) if (body[f] !== undefined) out[f] = body[f];
    if (out.phone !== undefined) out.phone = digits(out.phone);
    return sanitize(out);
  }

  router.get('/admin/members', ...adminOnly, async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const filter = q
        ? { $or: [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: digits(q) || q } }] }
        : {};
      const rows = await M.members.find(filter).sort({ createdAt: -1 }).limit(500);
      res.json(rows.map((r) => {
        const m = r.toJSON();
        return { ...m, status: membershipStatus(m), daysLeft: daysUntil(m.planExpiry) };
      }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/members', ...adminOnly, async (req, res) => {
    try {
      const data = pickMemberFields(req.body || {});
      const password = String(req.body?.password || '');
      if (!data.name) return res.status(400).json({ error: 'Name is required' });
      if (!data.phone || data.phone.length < 10) return res.status(400).json({ error: 'A valid phone number is required' });
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      if (await M.members.findOne({ phone: data.phone })) {
        return res.status(409).json({ error: 'A member with this phone number already exists' });
      }
      const row = await M.members.create({
        ...data,
        passwordHash: bcrypt.hashSync(password, 10),
        mustChangePassword: true,
        active: data.active !== false,
        createdAt: new Date(),
      });
      res.status(201).json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/admin/members/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const data = pickMemberFields(req.body || {});
      if (data.phone) {
        const clash = await M.members.findOne({ phone: data.phone, _id: { $ne: req.params.id } });
        if (clash) return res.status(409).json({ error: 'Another member already uses this phone number' });
      }
      const row = await M.members.findByIdAndUpdate(req.params.id, { $set: data }, { new: true });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/members/:id/password', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const password = String(req.body?.password || '');
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const row = await M.members.findByIdAndUpdate(
        req.params.id,
        { $set: { passwordHash: bcrypt.hashSync(password, 10), mustChangePassword: true } },
        { new: true }
      );
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/admin/members/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const memberId = req.params.id;
      await Promise.all([
        M.members.findByIdAndDelete(memberId),
        M.attendance.deleteMany({ memberId }),
        M.payments.deleteMany({ memberId }),
        M.workout_plans.deleteMany({ memberId }),
        M.diet_plans.deleteMany({ memberId }),
        M.measurements.deleteMany({ memberId }),
        M.workout_logs.deleteMany({ memberId }),
        M.progress_photos.deleteMany({ memberId }),
        M.class_bookings.deleteMany({ memberId }),
        M.pt_sessions.deleteMany({ memberId }),
        M.renewal_requests.deleteMany({ memberId }),
      ]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Everything about one member, for the admin detail drawer. */
  router.get('/admin/members/:id/detail', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const memberId = req.params.id;
      const member = await M.members.findById(memberId);
      if (!member) return res.status(404).json({ error: 'Not found' });

      const [attendance, payments, workoutPlan, dietPlan, measurements, photos, ptSessions] = await Promise.all([
        M.attendance.find({ memberId }).sort({ date: -1 }).limit(200),
        M.payments.find({ memberId }).sort({ date: -1 }).limit(100),
        M.workout_plans.findOne({ memberId }),
        M.diet_plans.findOne({ memberId }),
        M.measurements.find({ memberId }).sort({ date: -1 }).limit(100),
        M.progress_photos.find({ memberId }).sort({ date: -1 }).limit(100),
        M.pt_sessions.find({ memberId }).sort({ date: 1 }).limit(100),
      ]);
      const m = member.toJSON();
      res.json({
        member: { ...m, status: membershipStatus(m), daysLeft: daysUntil(m.planExpiry) },
        attendance,
        attendanceSummary: attendanceSummary(attendance),
        payments,
        workoutPlan,
        dietPlan,
        measurements,
        photos,
        ptSessions,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== ADMIN: ATTENDANCE / PAYMENTS / PLANS =====================
  router.post('/admin/attendance', ...adminOnly, async (req, res) => {
    try {
      const memberId = String(req.body?.memberId || '');
      if (!isValidId(memberId)) return res.status(400).json({ error: 'Invalid member' });
      const date = req.body?.date ? new Date(req.body.date) : new Date();
      if (Number.isNaN(date.getTime())) return res.status(400).json({ error: 'Invalid date' });

      const { start: dayStart, end: dayEnd } = dayRange(date);
      if (await M.attendance.findOne({ memberId, date: { $gte: dayStart, $lt: dayEnd } })) {
        return res.status(409).json({ error: 'Attendance already marked for this day' });
      }
      res.status(201).json(await M.attendance.create({ memberId, date, markedBy: 'admin' }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/admin/attendance/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      await M.attendance.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/payments', ...adminOnly, async (req, res) => {
    try {
      const memberId = String(req.body?.memberId || '');
      if (!isValidId(memberId)) return res.status(400).json({ error: 'Invalid member' });
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Enter a valid amount' });

      const row = await M.payments.create({
        memberId,
        amount,
        date: req.body?.date ? new Date(req.body.date) : new Date(),
        method: ['cash', 'upi', 'card', 'bank'].includes(req.body?.method) ? req.body.method : 'cash',
        planName: String(req.body?.planName || '').slice(0, 80),
        periodFrom: req.body?.periodFrom ? new Date(req.body.periodFrom) : null,
        periodTo: req.body?.periodTo ? new Date(req.body.periodTo) : null,
        invoiceNo: await nextInvoiceNo(),
        status: 'paid',
      });

      // Recording a payment for a period rolls the membership forward.
      if (req.body?.periodTo) {
        await M.members.findByIdAndUpdate(memberId, {
          $set: {
            planExpiry: new Date(req.body.periodTo),
            ...(req.body?.periodFrom ? { planStart: new Date(req.body.periodFrom) } : {}),
            ...(req.body?.planName ? { planName: String(req.body.planName).slice(0, 80) } : {}),
            frozen: false,
          },
        });
      }
      res.status(201).json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/admin/payments/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      await M.payments.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/admin/members/:id/workout-plan', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const data = sanitize({
        title: String(req.body?.title || 'Workout Plan').slice(0, 120),
        days: Array.isArray(req.body?.days) ? req.body.days.slice(0, 7) : [],
        notes: String(req.body?.notes || '').slice(0, 2000),
      });
      const row = await M.workout_plans.findOneAndUpdate(
        { memberId: req.params.id },
        { $set: { ...data, memberId: req.params.id, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/admin/members/:id/diet-plan', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const data = sanitize({
        title: String(req.body?.title || 'Diet Plan').slice(0, 120),
        meals: Array.isArray(req.body?.meals) ? req.body.meals.slice(0, 12) : [],
        notes: String(req.body?.notes || '').slice(0, 2000),
        targetCalories: Number(req.body?.targetCalories) || null,
      });
      const row = await M.diet_plans.findOneAndUpdate(
        { memberId: req.params.id },
        { $set: { ...data, memberId: req.params.id, updatedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/members/:id/measurements', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const NUMERIC = ['weight', 'height', 'chest', 'waist', 'hips', 'arms', 'thighs', 'bodyFat'];
      const row = { memberId: req.params.id, date: req.body?.date ? new Date(req.body.date) : new Date(), recordedBy: 'admin' };
      for (const f of NUMERIC) {
        const v = Number(req.body?.[f]);
        if (Number.isFinite(v) && v > 0 && v < 1000) row[f] = v;
      }
      if (!row.weight) return res.status(400).json({ error: 'Weight is required' });
      res.status(201).json(await M.measurements.create(row));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== ADMIN: CLASSES / PT / RENEWALS =====================
  router.get('/admin/classes', ...adminOnly, async (_req, res) => {
    try {
      const rows = await M.classes.find().sort({ order: 1 }).limit(100);
      const counts = await M.class_bookings.aggregate([{ $group: { _id: '$classId', n: { $sum: 1 } } }]);
      const map = new Map(counts.map((c) => [String(c._id), c.n]));
      res.json(rows.map((r) => ({ ...r.toJSON(), booked: map.get(r._id.toString()) || 0 })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/classes', ...adminOnly, async (req, res) => {
    try {
      res.status(201).json(await M.classes.create(sanitize({ ...req.body, createdAt: new Date() })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/admin/classes/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const row = await M.classes.findByIdAndUpdate(req.params.id, { $set: sanitize(req.body) }, { new: true });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/admin/classes/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      await Promise.all([
        M.classes.findByIdAndDelete(req.params.id),
        M.class_bookings.deleteMany({ classId: req.params.id }),
      ]);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/pt-sessions', ...adminOnly, async (req, res) => {
    try {
      const memberId = String(req.body?.memberId || '');
      if (!isValidId(memberId)) return res.status(400).json({ error: 'Invalid member' });
      const date = req.body?.date ? new Date(req.body.date) : null;
      if (!date || Number.isNaN(date.getTime())) return res.status(400).json({ error: 'A valid date is required' });
      res.status(201).json(await M.pt_sessions.create(sanitize({
        memberId,
        date,
        time: String(req.body?.time || '').slice(0, 20),
        trainerName: String(req.body?.trainerName || '').slice(0, 80),
        focus: String(req.body?.focus || '').slice(0, 120),
        status: 'scheduled',
      })));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/admin/pt-sessions/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const allowed = {};
      if (['scheduled', 'completed', 'cancelled'].includes(req.body?.status)) allowed.status = req.body.status;
      const row = await M.pt_sessions.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/admin/pt-sessions/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      await M.pt_sessions.findByIdAndDelete(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/admin/renewal-requests', ...adminOnly, async (_req, res) => {
    try {
      res.json(await M.renewal_requests.find().sort({ createdAt: -1 }).limit(200));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.patch('/admin/renewal-requests/:id', ...adminOnly, async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'Invalid id' });
      const allowed = {};
      if (['pending', 'contacted', 'completed', 'cancelled'].includes(req.body?.status)) allowed.status = req.body.status;
      const row = await M.renewal_requests.findByIdAndUpdate(req.params.id, { $set: allowed }, { new: true });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Counts for the admin overview cards. */
  router.get('/admin/member-stats', ...adminOnly, async (_req, res) => {
    try {
      const all = await M.members.find().limit(2000);
      const stats = { total: all.length, active: 0, expiring: 0, expired: 0, frozen: 0 };
      for (const r of all) {
        const s = membershipStatus(r.toJSON());
        if (stats[s] !== undefined) stats[s] += 1;
      }
      const { start: dayStart, end: dayEnd } = dayRange(new Date());
      stats.checkedInToday = await M.attendance.countDocuments({ date: { $gte: dayStart, $lt: dayEnd } });
      stats.pendingRenewals = await M.renewal_requests.countDocuments({ status: 'pending' });
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return { router, makeRateLimit };
}
