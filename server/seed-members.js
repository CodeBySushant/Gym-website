/**
 * Demo member seeder — creates one fully-populated member so you can log into
 * the portal and see every screen with real-looking data.
 *
 *   npm run seed:members
 *
 * Safe to re-run: it skips if the demo phone number already exists.
 * Delete the demo member from Admin → Members before going live.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';

const DEMO_PHONE = '919999900001';
const DEMO_PASSWORD = 'demo1234';

const loose = () => new mongoose.Schema({}, { strict: false, versionKey: false });
const model = (n) => mongoose.models[n] || mongoose.model(n, loose(), n);

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daysAhead = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function main() {
  console.log('[seed:members] Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const Members = model('members');
  if (await Members.findOne({ phone: DEMO_PHONE })) {
    console.log('[seed:members] Demo member already exists — nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Attach the first seeded trainer, if there is one.
  const Trainers = model('trainers');
  const trainer = await Trainers.findOne();

  const member = await Members.create({
    name: 'Rohit Sharma',
    phone: DEMO_PHONE,
    email: 'rohit.demo@example.com',
    gender: 'Male',
    address: 'Nehru Nagar, Bhopal',
    emergencyContact: '919999900002',
    planName: 'Quarterly',
    planStart: daysAgo(52),
    planExpiry: daysAhead(38),
    trainerId: trainer ? trainer._id.toString() : '',
    passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
    mustChangePassword: false,
    active: true,
    createdAt: daysAgo(400),
  });
  const memberId = member._id.toString();
  console.log('[seed:members] Created member');

  // --- Attendance: ~4 visits/week for the last 20 weeks, with a live streak ---
  const attendance = [];
  for (let i = 0; i < 140; i++) {
    const d = daysAgo(i);
    const dow = d.getDay();
    if (dow === 0) continue;                 // gym closed Sunday
    if (i > 3 && Math.random() > 0.62) continue; // realistic gaps, but keep a current streak
    attendance.push({ memberId, date: d, markedBy: 'admin' });
  }
  await model('attendance').insertMany(attendance);
  console.log(`[seed:members] ${attendance.length} attendance records`);

  // --- Payments ---
  await model('payments').insertMany([
    {
      memberId, amount: 6999, date: daysAgo(52), method: 'upi', planName: 'Quarterly',
      periodFrom: daysAgo(52), periodTo: daysAhead(38), invoiceNo: 'INV-2026-0001', status: 'paid',
    },
    {
      memberId, amount: 6999, date: daysAgo(145), method: 'cash', planName: 'Quarterly',
      periodFrom: daysAgo(145), periodTo: daysAgo(53), invoiceNo: 'INV-2026-0002', status: 'paid',
    },
    {
      memberId, amount: 2499, date: daysAgo(238), method: 'card', planName: 'Monthly',
      periodFrom: daysAgo(238), periodTo: daysAgo(208), invoiceNo: 'INV-2026-0003', status: 'paid',
    },
  ]);
  console.log('[seed:members] 3 payments');

  // --- Workout plan ---
  await model('workout_plans').create({
    memberId,
    title: 'Push / Pull / Legs — Intermediate',
    updatedAt: daysAgo(12),
    notes: 'Warm up 8 minutes before every session. Add 2.5kg once you hit the top of the rep range on all sets with clean form.',
    days: [
      {
        day: 'Day 1', focus: 'Push',
        exercises: [
          { name: 'Barbell Bench Press', sets: '4', reps: '6-8', notes: 'Control the descent, 2 sec down.' },
          { name: 'Incline Dumbbell Press', sets: '3', reps: '8-10' },
          { name: 'Overhead Shoulder Press', sets: '3', reps: '8-10' },
          { name: 'Cable Lateral Raise', sets: '3', reps: '12-15', notes: 'Light weight, strict form.' },
          { name: 'Triceps Rope Pushdown', sets: '3', reps: '12-15' },
        ],
      },
      {
        day: 'Day 2', focus: 'Pull',
        exercises: [
          { name: 'Deadlift', sets: '4', reps: '5', notes: 'Reset between every rep.' },
          { name: 'Pull-ups', sets: '4', reps: 'To failure', notes: 'Add resistance band if needed.' },
          { name: 'Barbell Row', sets: '3', reps: '8-10' },
          { name: 'Face Pulls', sets: '3', reps: '15' },
          { name: 'Barbell Curl', sets: '3', reps: '10-12' },
        ],
      },
      {
        day: 'Day 3', focus: 'Legs',
        exercises: [
          { name: 'Back Squat', sets: '4', reps: '6-8', notes: 'Depth over weight.' },
          { name: 'Romanian Deadlift', sets: '3', reps: '10' },
          { name: 'Leg Press', sets: '3', reps: '12' },
          { name: 'Walking Lunges', sets: '3', reps: '20 steps' },
          { name: 'Standing Calf Raise', sets: '4', reps: '15-20' },
        ],
      },
      {
        day: 'Day 4', focus: 'Upper Accessory',
        exercises: [
          { name: 'Incline Dumbbell Curl', sets: '3', reps: '12' },
          { name: 'Skull Crushers', sets: '3', reps: '12' },
          { name: 'Lat Pulldown', sets: '3', reps: '10-12' },
          { name: 'Hanging Leg Raise', sets: '3', reps: '15' },
        ],
      },
    ],
  });

  // --- Workout logs ---
  const logs = [];
  const dayNames = ['Day 1', 'Day 2', 'Day 3', 'Day 4'];
  for (let i = 0; i < 30; i += 2) {
    logs.push({ memberId, day: dayNames[(i / 2) % 4], date: daysAgo(i) });
  }
  await model('workout_logs').insertMany(logs);
  console.log(`[seed:members] workout plan + ${logs.length} logs`);

  // --- Diet plan ---
  await model('diet_plans').create({
    memberId,
    title: 'Lean Bulk — 2,400 kcal',
    targetCalories: 2400,
    updatedAt: daysAgo(12),
    notes: 'Drink at least 3 litres of water a day. Keep the post-workout meal within 90 minutes of training.',
    meals: [
      { time: '7:00 AM', name: 'Breakfast', calories: 520, items: ['4 egg whites + 2 whole eggs', '2 multigrain rotis', '1 bowl papaya'] },
      { time: '11:00 AM', name: 'Mid-Morning', calories: 280, items: ['1 scoop whey protein', '1 banana', '10 almonds'] },
      { time: '2:00 PM', name: 'Lunch', calories: 680, items: ['150g grilled chicken or 200g paneer', '1 cup brown rice', 'Mixed vegetable sabzi', '1 bowl curd'] },
      { time: '5:30 PM', name: 'Pre-Workout', calories: 240, items: ['1 slice brown bread with peanut butter', 'Black coffee'] },
      { time: '8:30 PM', name: 'Dinner', calories: 620, items: ['150g fish or rajma', '2 rotis', 'Large green salad'] },
      { time: '10:30 PM', name: 'Before Bed', calories: 160, items: ['1 glass toned milk', '1 tsp turmeric'] },
    ],
  });

  // --- Measurements: steady downward weight trend ---
  const measurements = [];
  for (let i = 10; i >= 0; i--) {
    measurements.push({
      memberId,
      date: daysAgo(i * 14),
      weight: Number((82.4 - (10 - i) * 0.65 + (Math.random() - 0.5) * 0.4).toFixed(1)),
      chest: Number((104 - (10 - i) * 0.2).toFixed(1)),
      waist: Number((92 - (10 - i) * 0.8).toFixed(1)),
      arms: Number((35.5 + (10 - i) * 0.12).toFixed(1)),
      thighs: Number((58 + (10 - i) * 0.1).toFixed(1)),
      bodyFat: Number((22.5 - (10 - i) * 0.55).toFixed(1)),
      recordedBy: 'admin',
    });
  }
  await model('measurements').insertMany(measurements);
  console.log(`[seed:members] ${measurements.length} measurements`);

  // --- Classes (gym-wide) ---
  const Classes = model('classes');
  if ((await Classes.countDocuments()) === 0) {
    await Classes.insertMany([
      { name: 'Morning HIIT', day: 'Monday', time: '6:30 AM', trainerName: 'Priya Sharma', capacity: 15, order: 1, active: true, description: 'High-intensity intervals to start the week. Bring water.' },
      { name: 'Strength Basics', day: 'Tuesday', time: '7:00 PM', trainerName: 'Arjun Verma', capacity: 12, order: 2, active: true, description: 'Squat, bench and deadlift technique for beginners.' },
      { name: 'Core & Mobility', day: 'Wednesday', time: '6:30 AM', trainerName: 'Priya Sharma', capacity: 20, order: 3, active: true, description: 'Low-impact session focused on core stability and hip mobility.' },
      { name: 'Functional Circuit', day: 'Thursday', time: '7:00 PM', trainerName: 'Rahul Singh', capacity: 15, order: 4, active: true, description: 'Kettlebells, sleds and bodyweight in a timed circuit.' },
      { name: 'Weekend Bootcamp', day: 'Saturday', time: '8:00 AM', trainerName: 'Arjun Verma', capacity: 25, order: 5, active: true, description: 'Full-body conditioning. Our busiest class — book early.' },
    ]);
    console.log('[seed:members] 5 classes');
  }

  // --- PT sessions ---
  await model('pt_sessions').insertMany([
    { memberId, date: daysAhead(2), time: '7:00 PM', trainerName: trainer?.name || 'Arjun Verma', focus: 'Deadlift technique', status: 'scheduled' },
    { memberId, date: daysAhead(9), time: '7:00 PM', trainerName: trainer?.name || 'Arjun Verma', focus: 'Upper body strength', status: 'scheduled' },
    { memberId, date: daysAgo(5), time: '7:00 PM', trainerName: trainer?.name || 'Arjun Verma', focus: 'Squat depth work', status: 'completed' },
  ]);

  await mongoose.disconnect();
  console.log(`
[seed:members] Done.

  Portal:    http://localhost:3000/member/login
  Phone:     ${DEMO_PHONE}
  Password:  ${DEMO_PASSWORD}

  Delete this demo member from Admin -> Members before going live.
`);
}

main().catch((e) => {
  console.error('[seed:members] Failed:', e.message);
  process.exit(1);
});
