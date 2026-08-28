/**
 * Demo content seeder — fills the database with sample content and stock
 * gym photos (Unsplash) so the site looks complete immediately.
 *
 * Usage:  npm run seed
 * Safe to run once; it only seeds collections that are EMPTY, so it never
 * overwrites content you've added in the admin panel. To re-seed from
 * scratch, drop the database first.
 *
 * All images are free Unsplash stock photos — replace them with the gym's
 * real photos from the admin panel before selling/launching.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/supermen-fitness-gym';

const img = (id, w = 1200) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const DATA = {
  settings: [
    {
      heroHeadline: 'BORN FROM RESOLVE',
      heroSubline: 'Elite equipment. Expert coaching. A community that pushes you further than you thought possible.',
      whatsappNumber: '918305213300',
      whatsappLink: '',
      callNumber: '918305213300',
      address: '2nd Floor, BM-125, Main Road, Near Sai Mandir, Nehru Nagar, Bhopal, Madhya Pradesh 462003',
      googleMapsUrl:
        'https://www.google.com/maps?q=Supermen+fitness+gym,+Nehru+Nagar,+Bhopal+462003&output=embed',
      openHours: 'Mon – Sat: 6:00 AM – 10:00 PM · Sunday Closed',
      heroVideoUrl: '',
      heroImageUrl: '',
      servicesTitle: 'Elite Offerings',
      servicesSubtitle: 'World-class equipment, facilities and services under one roof',
    },
  ],
  services: [
    { title: 'Free Weights Zone', category: 'Equipment', imageUrl: img('1534438327276-14e5300c3a48'), order: 1 },
    { title: 'Cardio Deck', category: 'Equipment', imageUrl: img('1540497077202-7c8a3999166f'), order: 2 },
    { title: 'Functional Training Rig', category: 'Equipment', imageUrl: img('1517836357463-d25dfeac3438'), order: 3 },
    { title: 'Locker Rooms & Showers', category: 'Facilities', imageUrl: img('1558611848-73f7eb4001a1'), order: 4 },
    { title: 'Recovery Lounge', category: 'Facilities', imageUrl: img('1571902943202-507ec2618e8f'), order: 5 },
    { title: 'Nutrition Bar', category: 'Facilities', imageUrl: img('1574680096145-d05b474e2155'), order: 6 },
    { title: 'Personal Training', category: 'Services', imageUrl: img('1599058917212-d750089bc07e'), order: 7 },
    { title: 'Group Classes', category: 'Services', imageUrl: img('1571019614242-c5c5dee9f50b'), order: 8 },
    { title: 'Diet & Nutrition Coaching', category: 'Services', imageUrl: img('1490645935967-10de6ba17061'), order: 9 },
  ],
  trainers: [
    {
      name: 'Arjun Verma',
      specialization: 'Strength & Conditioning',
      bio: '10+ years coaching powerlifting and strength athletes. Certified S&C specialist focused on building raw, functional strength safely.',
      imageUrl: img('1567013127542-490d757e51fc', 800),
      quote: 'Strength is earned one rep at a time.',
      order: 1,
    },
    {
      name: 'Priya Sharma',
      specialization: 'Functional Fitness & HIIT',
      bio: 'Former state-level athlete turned coach. Designs high-energy functional programs that build endurance, mobility and confidence.',
      imageUrl: img('1571731956672-f2b94d7dd0cb', 800),
      quote: 'Your only competition is yesterday.',
      order: 2,
    },
    {
      name: 'Rahul Singh',
      specialization: 'Body Transformation',
      bio: 'Specialist in fat loss and muscle-building transformations, with personalised diet planning for Indian food habits.',
      imageUrl: img('1548690312-e3b507d8c110', 800),
      quote: 'Discipline beats motivation every day.',
      order: 3,
    },
  ],
  testimonials: [
    { name: 'Vikram Patel', role: 'Member — 2 years', content: 'Lost 18kg in 10 months. The trainers here actually track your progress and adjust your plan — not just sell you a membership.', order: 1 },
    { name: 'Sneha Gupta', role: 'Member — 1 year', content: 'As a beginner I was intimidated by gyms. The coaches made me feel welcome from day one and now I deadlift more than my bodyweight.', order: 2 },
    { name: 'Amit Joshi', role: 'Member — 3 years', content: 'Best equipment in the city, open when I need it, and the community keeps you accountable. Worth every rupee.', order: 3 },
  ],
  gallery: [
    { type: 'image', url: img('1526506118085-60ce8714f8c5'), caption: 'The weights floor', order: 1 },
    { type: 'image', url: img('1583454110551-21f2fa2afe61'), caption: 'Push your limits', order: 2 },
    { type: 'image', url: img('1584735935682-2f2b69dff9d2'), caption: 'Functional zone', order: 3 },
    { type: 'image', url: img('1605296867304-46d5465a13f1'), caption: 'Deadlift day', order: 4 },
    { type: 'image', url: img('1594381898411-846e7d193883'), caption: 'Kettlebell work', order: 5 },
    { type: 'image', url: img('1581009146145-b5ef050c2e1e'), caption: 'Every rep counts', order: 6 },
  ],
  pricing: [
    {
      name: 'Monthly', price: '1,499', period: 'month',
      features: ['Full gym access', 'All equipment zones', 'Locker facility', 'Fitness assessment'],
      isPopular: false, order: 1,
    },
    {
      name: 'Quarterly', price: '3,999', period: '3 months',
      features: ['Everything in Monthly', '1 free PT session / month', 'Diet consultation', 'Guest pass (1 / month)'],
      isPopular: true, order: 2,
    },
    {
      name: 'Annual', price: '12,999', period: 'year',
      features: ['Everything in Quarterly', '2 free PT sessions / month', 'Quarterly body composition scan', 'Freeze up to 30 days'],
      isPopular: false, order: 3,
    },
  ],
  health_tips: [
    {
      title: 'Protein: How Much Do You Actually Need?',
      content: 'For muscle building, aim for 1.6-2g of protein per kg of bodyweight daily. Spread it across 4-5 meals — dal, paneer, eggs, chicken and whey all count.',
      imageUrl: img('1490645935967-10de6ba17061', 800), category: 'Nutrition',
      createdAt: new Date().toISOString(), order: 1,
    },
    {
      title: 'Why Rest Days Build Muscle',
      content: 'Muscle grows during recovery, not during the workout. Take at least 1-2 full rest days a week and sleep 7-8 hours — it is the cheapest supplement there is.',
      imageUrl: img('1571902943202-507ec2618e8f', 800), category: 'Recovery',
      createdAt: new Date().toISOString(), order: 2,
    },
    {
      title: 'Master Form Before Adding Weight',
      content: 'Ego lifting is the #1 cause of gym injuries. Record your sets, learn the movement pattern with lighter weight, and progress 2.5kg at a time.',
      imageUrl: img('1526506118085-60ce8714f8c5', 800), category: 'Workout',
      createdAt: new Date().toISOString(), order: 3,
    },
  ],
  faqs: [
    { question: 'What are the gym timings?', answer: 'We are open 6:00 AM to 10:00 PM, Monday to Saturday. We are closed on Sundays. Timings on public holidays are announced in advance at the front desk.', order: 1 },
    { question: 'Is there a free trial?', answer: 'Yes — book a free trial through the form on this page and our team will call you to schedule your first session, including a floor walkthrough with a trainer.', order: 2 },
    { question: 'Do you provide personal trainers?', answer: 'Yes, certified personal trainers are available at additional cost. Quarterly and Annual members get free PT sessions included in their plan.', order: 3 },
    { question: 'Can I freeze my membership?', answer: 'Annual memberships can be frozen for up to 30 days per year for travel or medical reasons. Speak to the front desk to activate a freeze.', order: 4 },
    { question: 'Is there parking available?', answer: 'Yes, free two-wheeler and car parking is available for members right outside the facility.', order: 5 },
  ],
};

async function main() {
  console.log('[seed] Connecting to', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const looseSchema = () => new mongoose.Schema({}, { strict: false, versionKey: false });

  for (const [name, rows] of Object.entries(DATA)) {
    const Model = mongoose.models[name] || mongoose.model(name, looseSchema(), name);
    const count = await Model.countDocuments();
    if (count > 0) {
      console.log(`[seed] '${name}' already has ${count} docs — skipping`);
      continue;
    }
    await Model.insertMany(rows);
    console.log(`[seed] '${name}' seeded with ${rows.length} docs`);
  }

  await mongoose.disconnect();
  console.log('[seed] Done! Start the site and it will be fully populated.');
}

main().catch((e) => {
  console.error('[seed] Failed:', e.message);
  process.exit(1);
});
