import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Settings, 
  Dumbbell, 
  Users, 
  MessageSquare, 
  Image as ImageIcon, 
  CreditCard, 
  Lightbulb, 
  LogOut, 
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  Upload,
  PhoneCall,
  Check,
  Heart,
  Sparkles,
  Star,
  Menu,
  Building2,
  UserCog,
  RefreshCw
} from 'lucide-react';
import { UserProfile, Setting, Service, Trainer, Testimonial, GalleryItem, Lead, PricingPlan, HealthTip, FAQ } from '../types';
import { db, collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc, query, orderBy, signOut, auth, where, limit, uploadImageToStorage } from '../api';
import type { ImagePreset } from '../api';
import { BRAND, DEFAULTS } from '../config';
import MembersManager from './MembersManager';
import RenewalsManager from './RenewalsManager';
import { adminRequest } from '../adminApi';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

const ACTION_LABEL: Record<OperationType, string> = {
  [OperationType.CREATE]: 'save',
  [OperationType.UPDATE]: 'update',
  [OperationType.DELETE]: 'delete',
  [OperationType.LIST]: 'load',
  [OperationType.GET]: 'load',
  [OperationType.WRITE]: 'save',
};

/** Turns a collection path like 'health_tips' into something readable. */
const prettyPath = (path: string | null) =>
  path ? path.split('/')[0].replace(/_/g, ' ') : 'data';

/**
 * Reports a failed API call to the admin.
 *
 * Two things changed here. It no longer says "Firestore" — this app talks to
 * its own Express + MongoDB backend, and the gym owner has no idea what
 * Firestore is. And it deliberately does NOT re-throw: several call sites are
 * onSnapshot error callbacks, where throwing produced unhandled promise
 * rejections that nothing could catch.
 */
function handleDataError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[admin] API error', { operationType, path, message, admin: auth.currentUser?.email });

  const unreachable = /database unavailable|failed to fetch|networkerror|load failed/i.test(message);
  toast.error(
    unreachable
      ? 'Cannot reach the server. Check that the backend is running and MongoDB is up.'
      : `Could not ${ACTION_LABEL[operationType] || 'load'} ${prettyPath(path)}. ${message}`
  );
}

import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface AdminDashboardProps {
  user: UserProfile | null;
}

export default function AdminDashboard({ user }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const menuItems = [
    { name: 'Overview', path: '', icon: LayoutDashboard },
    { name: 'Leads', path: 'leads', icon: PhoneCall },
    { name: 'Members', path: 'members', icon: UserCog },
    { name: 'Renewals', path: 'renewals', icon: RefreshCw },
    { name: 'Equipment', path: 'equipment', icon: Dumbbell },
    { name: 'Facilities', path: 'facilities', icon: Building2 },
    { name: 'Services', path: 'services', icon: Sparkles },
    { name: 'Trainers', path: 'trainers', icon: Users },
    { name: 'Testimonials', path: 'testimonials', icon: MessageSquare },
    { name: 'Gallery', path: 'gallery', icon: ImageIcon },
    { name: 'Pricing', path: 'pricing', icon: CreditCard },
    { name: 'Health Tips', path: 'tips', icon: Lightbulb },
    { name: 'FAQs', path: 'faqs', icon: MessageSquare },
    { name: 'General Settings', path: 'settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex overflow-hidden relative">
      {/* Hamburger Button */}
      <button 
        onClick={toggleSidebar}
        aria-label="Open menu"
        className="fixed top-6 left-6 z-30 bg-[#FF003C] p-3 rounded-xl shadow-[0_0_20px_rgba(255,0,60,0.3)] hover:scale-110 transition-transform lg:hidden"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r border-white/10 flex flex-col h-screen fixed top-0 z-50 bg-black flex-shrink-0 transition-transform duration-500 ease-in-out lg:static lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-[#FF003C] p-2 rounded-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter uppercase italic">
              {BRAND.first} <span className="text-[#FF003C]">Admin</span>
            </span>
          </Link>
          <button onClick={closeSidebar} aria-label="Close menu" className="text-white/40 hover:text-white lg:hidden">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-grow p-4 space-y-2 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => {
            const fullPath = `/admin${item.path ? '/' + item.path : ''}`;
            const isActive = location.pathname === fullPath;
            return (
              <Link
                key={item.name}
                to={fullPath}
                onClick={closeSidebar}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all duration-300",
                  isActive 
                    ? "bg-[#FF003C] text-white shadow-[0_0_20px_rgba(255,0,60,0.4)] scale-[1.02]" 
                    : "text-white/40 hover:text-white hover:bg-white/5 hover:scale-[1.02]"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                <span className="relative">
                  {item.name}
                  {isActive && (
                    <motion.span 
                      layoutId="activeTab"
                      className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#FF003C] rounded-r-full"
                    />
                  )}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#FF003C] flex items-center justify-center font-black italic">
              {user?.displayName?.[0] || 'A'}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold truncate">{user?.displayName}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-black">Admin</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-widest text-white/40 hover:text-[#FF003C] hover:bg-[#FF003C]/10 transition-all duration-300"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow h-screen overflow-y-auto p-6 lg:p-10 pt-24 lg:pt-10 custom-scrollbar w-full">
        <Routes>
          <Route index element={<Overview />} />
          <Route path="leads" element={<LeadsManager />} />
          <Route path="members" element={<MembersManager />} />
          <Route path="renewals" element={<RenewalsManager />} />
          <Route path="settings" element={<GeneralSettingsManager />} />
          <Route path="equipment" element={<ServicesManager category="Equipment" />} />
          <Route path="facilities" element={<ServicesManager category="Facilities" />} />
          <Route path="services" element={<ServicesManager category="Services" />} />
          <Route path="trainers" element={<TrainersManager />} />
          <Route path="testimonials" element={<TestimonialsManager />} />
          <Route path="gallery" element={<GalleryManager />} />
          <Route path="pricing" element={<PricingManager />} />
          <Route path="tips" element={<TipsManager />} />
          <Route path="faqs" element={<FAQManager />} />
        </Routes>
      </main>
    </div>
  );
}

// --- Sub-components ---

function Overview() {
  const [stats, setStats] = useState({ 
    leads: 0, 
    services: 0, 
    trainers: 0, 
    gallery: 0,
    testimonials: 0,
    pricing: 0,
    tips: 0,
    faqs: 0
  });
  const [pendingRenewals, setPendingRenewals] = useState(0);

  // Renewal requests are not a content collection, so they come from the
  // members API rather than the Firebase-shaped shim.
  useEffect(() => {
    adminRequest<{ pendingRenewals?: number }>('/api/admin/member-stats')
      .then((s) => setPendingRenewals(s.pendingRenewals || 0))
      .catch(() => { /* card just shows 0 */ });
  }, []);

  useEffect(() => {
    const unsubLeads = onSnapshot(query(collection(db, 'leads'), limit(100)), s => setStats(prev => ({ ...prev, leads: s.size })), (err) => handleDataError(err, OperationType.LIST, 'leads'));
    const unsubServices = onSnapshot(query(collection(db, 'services'), limit(100)), s => setStats(prev => ({ ...prev, services: s.size })), (err) => handleDataError(err, OperationType.LIST, 'services'));
    const unsubTrainers = onSnapshot(query(collection(db, 'trainers'), limit(100)), s => setStats(prev => ({ ...prev, trainers: s.size })), (err) => handleDataError(err, OperationType.LIST, 'trainers'));
    const unsubGallery = onSnapshot(query(collection(db, 'gallery'), limit(100)), s => setStats(prev => ({ ...prev, gallery: s.size })), (err) => handleDataError(err, OperationType.LIST, 'gallery'));
    const unsubTestimonials = onSnapshot(query(collection(db, 'testimonials'), limit(100)), s => setStats(prev => ({ ...prev, testimonials: s.size })), (err) => handleDataError(err, OperationType.LIST, 'testimonials'));
    const unsubPricing = onSnapshot(query(collection(db, 'pricing'), limit(100)), s => setStats(prev => ({ ...prev, pricing: s.size })), (err) => handleDataError(err, OperationType.LIST, 'pricing'));
    const unsubTips = onSnapshot(query(collection(db, 'health_tips'), limit(100)), s => setStats(prev => ({ ...prev, tips: s.size })), (err) => handleDataError(err, OperationType.LIST, 'health_tips'));
    const unsubFAQs = onSnapshot(query(collection(db, 'faqs'), limit(100)), s => setStats(prev => ({ ...prev, faqs: s.size })), (err) => handleDataError(err, OperationType.LIST, 'faqs'));
    
    return () => { 
      unsubLeads(); unsubServices(); unsubTrainers(); unsubGallery(); 
      unsubTestimonials(); unsubPricing(); unsubTips(); unsubFAQs();
    };
  }, []);

  const cards = [
    { name: 'Total Leads', value: stats.leads, icon: PhoneCall, color: 'bg-blue-500' },
    { name: 'Pending Renewals', value: pendingRenewals, icon: RefreshCw, color: 'bg-amber-500' },
    { name: 'Services', value: stats.services, icon: Dumbbell, color: 'bg-[#FF003C]' },
    { name: 'Trainers', value: stats.trainers, icon: Users, color: 'bg-purple-500' },
    { name: 'Gallery Items', value: stats.gallery, icon: ImageIcon, color: 'bg-green-500' },
    { name: 'Testimonials', value: stats.testimonials, icon: MessageSquare, color: 'bg-yellow-500' },
    { name: 'Pricing Plans', value: stats.pricing, icon: CreditCard, color: 'bg-orange-500' },
    { name: 'Health Tips', value: stats.tips, icon: Lightbulb, color: 'bg-cyan-500' },
    { name: 'FAQs', value: stats.faqs, icon: MessageSquare, color: 'bg-pink-500' },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Dashboard <span className="text-[#FF003C]">Overview</span></h1>
        <p className="text-white/40 font-medium uppercase tracking-widest text-xs">Welcome back, Admin.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.name} className="bg-white/5 p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg", card.color)}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <div className="text-4xl font-black italic mb-1">{card.value}</div>
            <div className="text-xs font-bold uppercase tracking-widest text-white/40">{card.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const EMPTY_SETTINGS: Setting = {
  heroHeadline: DEFAULTS.heroHeadline,
  heroSubline: DEFAULTS.heroSubline,
  whatsappNumber: '',
  whatsappLink: '',
  callNumber: '',
  address: '',
  googleMapsUrl: '',
  openHours: '',
  heroVideoUrl: '',
  heroImageUrl: '',
  servicesTitle: '',
  servicesSubtitle: '',
};

function GeneralSettingsManager() {
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { uploadImage } = useImageUpload();

  useEffect(() => {
    // Fixed document ID so the form works even on a brand-new empty database.
    return onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        setSettings({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Setting);
      } else {
        setSettings({ ...EMPTY_SETTINGS });
      }
    }, (err) => handleDataError(err, OperationType.LIST, 'settings'));
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      const { id, ...data } = settings;
      // setDoc with merge works for both first save and later edits.
      await setDoc(doc(db, 'settings', id || 'general'), data, { merge: true });
      toast.success('General settings saved');
    } catch (error) {
      handleDataError(error, OperationType.WRITE, 'settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <div className="space-y-10 max-w-4xl">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">General <span className="text-[#FF003C]">Settings</span></h1>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
          <h3 className="text-lg font-black uppercase tracking-widest italic border-b border-white/10 pb-4 mb-6">Hero Section</h3>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Headline</label>
            <input
              type="text"
              value={settings.heroHeadline}
              onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Subline</label>
            <textarea
              value={settings.heroSubline}
              onChange={(e) => setSettings({ ...settings, heroSubline: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-24"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Hero Video URL</label>
            <input
              type="text"
              value={settings.heroVideoUrl}
              onChange={(e) => setSettings({ ...settings, heroVideoUrl: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
            />
            <p className="text-[10px] text-white/30 font-medium mt-2">
              Leave empty to use the background image below.
            </p>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Hero Background Image</label>
            {settings.heroImageUrl && (
              <div className="relative mb-3 rounded-xl overflow-hidden border border-white/10 aspect-[21/9] bg-black">
                <img src={settings.heroImageUrl} alt="Hero background preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => setSettings({ ...settings, heroImageUrl: '' })}
                  className="absolute top-2 right-2 bg-black/80 hover:bg-red-500 p-2 rounded-lg transition-colors"
                  aria-label="Remove hero background image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <label className="block bg-black border border-dashed border-white/15 rounded-xl px-4 py-6 text-center cursor-pointer hover:border-[#FF003C] transition-colors">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                {settings.heroImageUrl ? 'Replace Image' : 'Upload Image'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const url = await uploadImage(file, 'hero');
                    setSettings({ ...settings, heroImageUrl: url });
                  } catch { /* useImageUpload already shows a toast */ }
                  e.target.value = '';
                }}
              />
            </label>
            <p className="text-[10px] text-white/30 font-medium mt-2 leading-relaxed">
              Optional. Overrides the bundled desktop and mobile backgrounds with
              one image. Keep the subject on the right &mdash; headline copy sits on the left.
            </p>
          </div>
        </div>

        <div className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
          <h3 className="text-lg font-black uppercase tracking-widest italic border-b border-white/10 pb-4 mb-6">Services Section</h3>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Section Title</label>
            <input
              type="text"
              value={settings.servicesTitle || ''}
              onChange={(e) => setSettings({ ...settings, servicesTitle: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              placeholder="Elite Offerings"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Section Subtitle</label>
            <textarea
              value={settings.servicesSubtitle || ''}
              onChange={(e) => setSettings({ ...settings, servicesSubtitle: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-24 resize-none"
              placeholder="Premium equipment and services for your fitness journey."
            />
          </div>
        </div>

        <div className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10">
          <h3 className="text-lg font-black uppercase tracking-widest italic border-b border-white/10 pb-4 mb-6">Contact Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">WhatsApp Number</label>
              <input
                type="text"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                placeholder="e.g. 918305213300"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Call Number</label>
              <input
                type="text"
                value={settings.callNumber}
                onChange={(e) => setSettings({ ...settings, callNumber: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                placeholder="e.g. 918305213300"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Custom WhatsApp Link (optional)</label>
            <input
              type="text"
              value={settings.whatsappLink || ''}
              onChange={(e) => setSettings({ ...settings, whatsappLink: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              placeholder="e.g. https://wa.me/918305213300?text=Hi! (defaults to wa.me/number)"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Address</label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Open Hours</label>
            <input
              type="text"
              value={settings.openHours || ''}
              onChange={(e) => setSettings({ ...settings, openHours: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              placeholder="e.g. 6:00 AM – 10:00 PM · All 7 Days"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Maps Embed URL</label>
            <input
              type="text"
              value={settings.googleMapsUrl}
              onChange={(e) => setSettings({ ...settings, googleMapsUrl: e.target.value })}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              placeholder="https://www.google.com/maps/embed?pb=..."
            />
            <p className="text-[10px] text-white/30 font-medium mt-2 leading-relaxed">
              Must contain <span className="text-[#FF003C]">/embed</span> or <span className="text-[#FF003C]">output=embed</span>. A normal
              Google Maps link will not load. Get one from Maps → Share → Embed a map.
            </p>
          </div>
        </div>

        <div className="bg-[#FF003C]/5 border border-[#FF003C]/20 p-8 rounded-3xl space-y-6 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#FF003C] flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Quick <span className="text-[#FF003C]">Tips</span></h3>
          </div>
          <ul className="space-y-4 text-xs text-white/40 font-medium leading-relaxed uppercase tracking-widest">
            <li>• Use high quality images for better site appearance.</li>
            <li>• Keep headlines short and punchy.</li>
            <li>• Ensure contact numbers have country codes.</li>
            <li>• Use direct video links for hero section.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function LeadsManager() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
      setLeads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead)));
    }, (err) => handleDataError(err, OperationType.LIST, 'leads'));
  }, []);

  const updateStatus = async (id: string, status: Lead['status']) => {
    try {
      await updateDoc(doc(db, 'leads', id), { status });
      toast.success('Status updated');
    } catch (error) {
      handleDataError(error, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const deleteLead = async (id: string) => {
    const path = `leads/${id}`;
    try {
      await deleteDoc(doc(db, 'leads', id));
      toast.success('Lead deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Lead"
        message="Are you sure you want to delete this lead? This action cannot be undone."
        onConfirm={() => confirmDelete && deleteLead(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Membership <span className="text-[#FF003C]">Leads</span></h1>
      </header>

      <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-white/40">Name</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-white/40">Phone</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-white/40">Date</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-white/40">Status</th>
              <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-white/40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                <td className="px-8 py-6 font-bold">{lead.name}</td>
                <td className="px-8 py-6 font-mono text-[#FF003C]">{lead.phone}</td>
                <td className="px-8 py-6 text-sm text-white/60">{new Date(lead.createdAt).toLocaleDateString()}</td>
                <td className="px-8 py-6">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id!, e.target.value as any)}
                    className={cn(
                      "bg-black border border-white/10 rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-widest",
                      lead.status === 'new' && "text-blue-400",
                      lead.status === 'contacted' && "text-yellow-400",
                      lead.status === 'confirmed' && "text-green-400",
                      lead.status === 'cancelled' && "text-red-400"
                    )}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td className="px-8 py-6">
                  <button onClick={() => setConfirmDelete(lead.id!)} className="text-white/20 hover:text-red-500">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Helper for Image Uploads (real Firebase Storage) ---
const useImageUpload = () => {
  const uploadImage = async (file: File, preset?: ImagePreset): Promise<string> => {
    const toastId = toast.loading('Uploading image...');
    try {
      const url = await uploadImageToStorage(file, preset);
      toast.success('Image uploaded', { id: toastId });
      return url;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(msg, { id: toastId });
      throw error;
    }
  };
  return { uploadImage };
};

function SortableItem({ id, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as const
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tighter mb-2">{title}</h2>
          <p className="text-sm text-white/40">{message}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onCancel} className="flex-grow py-3 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={onConfirm} className="flex-grow py-3 rounded-xl font-black uppercase tracking-widest text-xs bg-red-500 text-white hover:bg-red-600 transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

function ServicesManager({ category }: { category?: 'Equipment' | 'Facilities' | 'Services' }) {
  const [services, setServices] = useState<Service[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const { uploadImage } = useImageUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const q = category 
      ? query(collection(db, 'services'), where('category', '==', category), orderBy('order'))
      : query(collection(db, 'services'), orderBy('order'));

    return onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    }, (err) => handleDataError(err, OperationType.LIST, 'services'));
  }, [category]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = services.findIndex((s) => s.id === activeId);
      const newIndex = services.findIndex((s) => s.id === overId);
      const newOrder = arrayMove(services, oldIndex, newIndex);
      
      setServices(newOrder);

      try {
        // Update Firestore orders
        const batch = newOrder.map((service: any, index) => 
          updateDoc(doc(db, 'services', service.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, 'services/reorder');
      }
    }
  };

  const handleSave = async () => {
    if (!editingService?.title || !editingService?.category || !editingService?.imageUrl) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      if (editingService.id) {
        const { id, ...data } = editingService;
        await updateDoc(doc(db, 'services', id), data as any);
      } else {
        await addDoc(collection(db, 'services'), { ...editingService, order: services.length + 1 });
      }
      setIsModalOpen(false);
      setEditingService(null);
      toast.success('Saved successfully');
    } catch (error) {
      handleDataError(error, OperationType.WRITE, 'services');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'services', id));
      toast.success('Deleted successfully');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, `services/${id}`);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await uploadImage(file, 'service');
      setEditingService(prev => ({ ...prev, imageUrl: base64 }));
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">
          Manage <span className="text-[#FF003C]">{category || 'Services'}</span>
        </h1>
        <button
          onClick={() => { setEditingService({ category: category || 'Equipment' }); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add {category === 'Equipment' ? 'Equipment' : category === 'Facilities' ? 'Facilities' : 'Service'}
        </button>
      </header>

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={services.map(s => s.id!)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <SortableItem key={service.id} id={service.id!}>
                <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden group h-full">
                  <div className="aspect-video relative">
                    <img src={service.imageUrl} alt={service.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setEditingService(service); setIsModalOpen(true); }}
                        className="bg-black/80 p-2 rounded-lg hover:bg-[#FF003C] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(service.id!); }}
                        className="bg-black/80 p-2 rounded-lg hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#FF003C] mb-1">{service.category}</div>
                    <h3 className="text-xl font-bold uppercase tracking-widest italic">{service.title}</h3>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingService?.id ? 'Edit' : 'Add'} Service</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Title</label>
                <input
                  type="text"
                  value={editingService?.title || ''}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Category</label>
                <select
                  value={editingService?.category || 'Equipment'}
                  onChange={(e) => setEditingService({ ...editingService, category: e.target.value as any })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                >
                  <option value="Equipment">Equipment</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Services">Services</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                    {editingService?.imageUrl && <img src={editingService.imageUrl} className="w-full h-full object-cover" />}
                  </div>
                  <label className="flex-grow bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                    <Upload className="w-5 h-5 text-white/40 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Upload Photo</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Trainers, Testimonials, Gallery, Pricing, Tips follow similar patterns...
// For brevity, I'll implement the others with simplified logic or placeholders if needed, 
// but the core "changeable" requirement is met by the ServicesManager pattern.
// I'll implement Trainers and Gallery as they are high priority.

function TrainersManager() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTrainer, setEditingTrainer] = useState<Partial<Trainer> | null>(null);
  const { uploadImage } = useImageUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'trainers';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setTrainers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = trainers.findIndex((t) => t.id === activeId);
      const newIndex = trainers.findIndex((t) => t.id === overId);
      const newOrder = arrayMove(trainers, oldIndex, newIndex);
      setTrainers(newOrder);
      const path = 'trainers';
      try {
        const batch = newOrder.map((trainer: any, index) => 
          updateDoc(doc(db, path, trainer.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingTrainer?.name || !editingTrainer?.imageUrl) {
      toast.error('Please fill in required fields');
      return;
    }
    const path = 'trainers';
    try {
      if (editingTrainer.id) {
        const { id, ...data } = editingTrainer;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { ...editingTrainer, order: trainers.length + 1 });
      }
      setIsModalOpen(false);
      setEditingTrainer(null);
      toast.success('Trainer saved');
    } catch (error) {
      handleDataError(error, editingTrainer.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'trainers';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('Trainer deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await uploadImage(file, 'trainer');
      setEditingTrainer(prev => ({ ...prev, imageUrl: base64 }));
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Trainer"
        message="Are you sure you want to delete this trainer? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">Trainers</span></h1>
        <button
          onClick={() => { setEditingTrainer({}); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Trainer
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={trainers.map(t => t.id!)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainers.map((trainer) => (
              <SortableItem key={trainer.id} id={trainer.id!}>
                <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden group h-full">
                  <div className="aspect-[3/4] relative">
                    <img src={trainer.imageUrl} alt={trainer.name} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setEditingTrainer(trainer); setIsModalOpen(true); }}
                        className="bg-black/80 p-2 rounded-lg hover:bg-[#FF003C] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(trainer.id!); }}
                        className="bg-black/80 p-2 rounded-lg hover:bg-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#FF003C] mb-1">{trainer.specialization}</div>
                    <h3 className="text-xl font-bold uppercase tracking-widest italic">{trainer.name}</h3>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingTrainer?.id ? 'Edit' : 'Add'} Trainer</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editingTrainer?.name || ''}
                onChange={(e) => setEditingTrainer({ ...editingTrainer, name: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <input
                type="text"
                placeholder="Specialization"
                value={editingTrainer?.specialization || ''}
                onChange={(e) => setEditingTrainer({ ...editingTrainer, specialization: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <textarea
                placeholder="Bio"
                value={editingTrainer?.bio || ''}
                onChange={(e) => setEditingTrainer({ ...editingTrainer, bio: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-24"
              />
              <textarea
                placeholder="Quote"
                value={editingTrainer?.quote || ''}
                onChange={(e) => setEditingTrainer({ ...editingTrainer, quote: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-20"
              />
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {editingTrainer?.imageUrl && <img src={editingTrainer.imageUrl} className="w-full h-full object-cover" />}
                </div>
                <label className="flex-grow bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                  <Upload className="w-5 h-5 text-white/40 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Upload Photo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save Trainer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GalleryManager() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<Partial<GalleryItem> | null>(null);
  const { uploadImage } = useImageUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'gallery';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = items.findIndex((i) => i.id === activeId);
      const newIndex = items.findIndex((i) => i.id === overId);
      const newOrder = arrayMove(items, oldIndex, newIndex);
      setItems(newOrder);
      const path = 'gallery';
      try {
        const batch = newOrder.map((item: any, index) => 
          updateDoc(doc(db, path, item.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingItem?.url) {
      toast.error('Please provide a URL or upload a file');
      return;
    }
    const path = 'gallery';
    try {
      if (editingItem.id) {
        const { id, ...data } = editingItem;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { ...editingItem, order: items.length + 1 });
      }
      setIsModalOpen(false);
      setEditingItem(null);
      toast.success('Gallery item saved');
    } catch (error) {
      handleDataError(error, editingItem.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'gallery';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('Item deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await uploadImage(file, 'gallery');
      setEditingItem(prev => ({ ...prev, url: base64, type: 'image' }));
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Gallery Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">Gallery</span></h1>
        <button
          onClick={() => { setEditingItem({ type: 'image' }); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id!)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id!}>
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden group aspect-square relative">
                  {item.type === 'image' ? (
                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-black flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#FF003C]/20 flex items-center justify-center mb-2">
                        <ImageIcon className="w-6 h-6 text-[#FF003C]" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 truncate w-full px-2">
                        {item.url}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsModalOpen(true); }}
                      className="bg-white/10 p-3 rounded-xl hover:bg-[#FF003C] transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id!); }}
                      className="bg-white/10 p-3 rounded-xl hover:bg-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                      <p className="text-[10px] font-bold uppercase tracking-widest truncate">{item.caption}</p>
                    </div>
                  )}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingItem?.id ? 'Edit' : 'Add'} Gallery Item</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setEditingItem({ ...editingItem, type: 'image' })}
                  className={cn(
                    "flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    editingItem?.type === 'image' ? "bg-[#FF003C] border-[#FF003C]" : "bg-black border-white/10 text-white/40"
                  )}
                >
                  Image
                </button>
                <button
                  onClick={() => setEditingItem({ ...editingItem, type: 'video' })}
                  className={cn(
                    "flex-grow py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                    editingItem?.type === 'video' ? "bg-[#FF003C] border-[#FF003C]" : "bg-black border-white/10 text-white/40"
                  )}
                >
                  Video URL
                </button>
              </div>

              {editingItem?.type === 'image' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                      {editingItem?.url && <img src={editingItem.url} className="w-full h-full object-cover" />}
                    </div>
                    <label className="flex-grow bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                      <Upload className="w-5 h-5 text-white/40 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Upload Photo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Or Image URL"
                    value={editingItem?.url || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Video URL (YouTube/Vimeo)"
                  value={editingItem?.url || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, url: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                />
              )}

              <input
                type="text"
                placeholder="Caption (Optional)"
                value={editingItem?.caption || ''}
                onChange={(e) => setEditingItem({ ...editingItem, caption: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Testimonials, Pricing, and Tips follow the same pattern...
function FAQManager() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingFaq, setEditingFaq] = useState<Partial<FAQ> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'faqs';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setFaqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQ)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = faqs.findIndex((f) => f.id === activeId);
      const newIndex = faqs.findIndex((f) => f.id === overId);
      const newOrder = arrayMove(faqs, oldIndex, newIndex);
      setFaqs(newOrder);
      const path = 'faqs';
      try {
        const batch = newOrder.map((faq: any, index) => 
          updateDoc(doc(db, path, faq.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingFaq?.question || !editingFaq?.answer) {
      toast.error('Please fill in all fields');
      return;
    }
    const path = 'faqs';
    try {
      if (editingFaq.id) {
        const { id, ...data } = editingFaq;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { ...editingFaq, order: faqs.length + 1 });
      }
      setIsModalOpen(false);
      setEditingFaq(null);
      toast.success('FAQ saved');
    } catch (error) {
      handleDataError(error, editingFaq.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'faqs';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('FAQ deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete FAQ"
        message="Are you sure you want to delete this FAQ? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">FAQs</span></h1>
        <button
          onClick={() => { setEditingFaq({ question: '', answer: '' }); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add FAQ
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={faqs.map(f => f.id!)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <SortableItem key={faq.id} id={faq.id!}>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-center justify-between group">
                  <div className="flex-grow pr-8">
                    <div className="font-bold uppercase italic text-lg mb-1">{faq.question}</div>
                    <div className="text-sm text-white/40 leading-relaxed">{faq.answer}</div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setEditingFaq(faq); setIsModalOpen(true); }}
                      className="bg-white/5 p-2 rounded-lg hover:text-[#FF003C] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(faq.id!); }}
                      className="bg-white/5 p-2 rounded-lg hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingFaq?.id ? 'Edit' : 'Add'} FAQ</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Question</label>
                <input
                  type="text"
                  placeholder="Question"
                  value={editingFaq?.question || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq!, question: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FF003C] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Answer</label>
                <textarea
                  placeholder="Answer"
                  value={editingFaq?.answer || ''}
                  onChange={(e) => setEditingFaq({ ...editingFaq!, answer: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 h-32 focus:border-[#FF003C] outline-none"
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save FAQ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonialsManager() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<Partial<Testimonial> | null>(null);
  const { uploadImage } = useImageUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'testimonials';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = testimonials.findIndex((t) => t.id === activeId);
      const newIndex = testimonials.findIndex((t) => t.id === overId);
      const newOrder = arrayMove(testimonials, oldIndex, newIndex);
      setTestimonials(newOrder);
      const path = 'testimonials';
      try {
        const batch = newOrder.map((testimonial: any, index) => 
          updateDoc(doc(db, path, testimonial.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingTestimonial?.name || !editingTestimonial?.content) {
      toast.error('Please fill in required fields');
      return;
    }
    const path = 'testimonials';
    try {
      if (editingTestimonial.id) {
        const { id, ...data } = editingTestimonial;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { ...editingTestimonial, order: testimonials.length + 1 });
      }
      setIsModalOpen(false);
      setEditingTestimonial(null);
      toast.success('Testimonial saved');
    } catch (error) {
      handleDataError(error, editingTestimonial.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'testimonials';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('Testimonial deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await uploadImage(file, 'member');
      setEditingTestimonial(prev => ({ ...prev, imageUrl: base64 }));
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Testimonial"
        message="Are you sure you want to delete this testimonial? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">Testimonials</span></h1>
        <button
          onClick={() => { setEditingTestimonial({}); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Testimonial
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={testimonials.map(t => t.id!)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((testimonial) => (
              <SortableItem key={testimonial.id} id={testimonial.id!}>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 relative group">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10">
                      {testimonial.imageUrl && <img src={testimonial.imageUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <div className="font-bold uppercase italic">{testimonial.name}</div>
                      <div className="text-[10px] text-white/40 uppercase tracking-widest">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/60 italic leading-relaxed">"{testimonial.content}"</p>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setEditingTestimonial(testimonial); setIsModalOpen(true); }}
                      className="bg-black/80 p-2 rounded-lg hover:text-[#FF003C] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(testimonial.id!); }}
                      className="bg-black/80 p-2 rounded-lg hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingTestimonial?.id ? 'Edit' : 'Add'} Testimonial</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editingTestimonial?.name || ''}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, name: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <input
                type="text"
                placeholder="Role (e.g. Member)"
                value={editingTestimonial?.role || ''}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, role: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <textarea
                placeholder="Content"
                value={editingTestimonial?.content || ''}
                onChange={(e) => setEditingTestimonial({ ...editingTestimonial, content: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-32"
              />
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {editingTestimonial?.imageUrl && <img src={editingTestimonial.imageUrl} className="w-full h-full object-cover" />}
                </div>
                <label className="flex-grow bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                  <Upload className="w-5 h-5 text-white/40 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Upload Photo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save Testimonial</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PricingManager() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Partial<PricingPlan> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'pricing';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPlan)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = plans.findIndex((p) => p.id === activeId);
      const newIndex = plans.findIndex((p) => p.id === overId);
      const newOrder = arrayMove(plans, oldIndex, newIndex);
      setPlans(newOrder);
      const path = 'pricing';
      try {
        const batch = newOrder.map((item: any, index) => 
          updateDoc(doc(db, path, item.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingPlan?.name || !editingPlan?.price) {
      toast.error('Please fill in required fields');
      return;
    }
    const path = 'pricing';
    // Ensure the fields required by the security rules always exist.
    const planData = {
      ...editingPlan,
      period: editingPlan.period || 'month',
      features: editingPlan.features || [],
      isPopular: editingPlan.isPopular ?? false,
    };
    try {
      if (planData.id) {
        const { id, ...data } = planData;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { ...planData, order: plans.length + 1 });
      }
      setIsModalOpen(false);
      setEditingPlan(null);
      toast.success('Pricing plan saved');
    } catch (error) {
      handleDataError(error, editingPlan.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'pricing';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('Plan deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Pricing Plan"
        message="Are you sure you want to delete this plan? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">Pricing</span></h1>
        <button
          onClick={() => { setEditingPlan({ features: [] }); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Plan
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={plans.map(p => p.id!)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <SortableItem key={plan.id} id={plan.id!}>
                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 relative group h-full">
                  <h3 className="text-2xl font-black italic uppercase mb-2">{plan.name}</h3>
                  <div className="text-4xl font-black text-[#FF003C] mb-6">₹{plan.price}<span className="text-sm text-white/40 font-bold uppercase tracking-widest">/{plan.period}</span></div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-sm text-white/60 flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-[#FF003C]" /> {f}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setEditingPlan(plan); setIsModalOpen(true); }}
                      className="bg-black/80 p-2 rounded-lg hover:text-[#FF003C] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(plan.id!); }}
                      className="bg-black/80 p-2 rounded-lg hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-8 bg-[#FF003C] text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingPlan?.id ? 'Edit' : 'Add'} Pricing Plan</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Plan Name"
                value={editingPlan?.name || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Price"
                  value={editingPlan?.price || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                />
                <input
                  type="text"
                  placeholder="Period (e.g. month)"
                  value={editingPlan?.period || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, period: e.target.value })}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
                />
              </div>
              <textarea 
                placeholder="Features (one per line)" 
                value={editingPlan?.features?.join('\n') || ''} 
                onChange={(e) => setEditingPlan({ ...editingPlan, features: e.target.value.split('\n').filter(f => f.trim()) })} 
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-32" 
              />
              <label className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer group">
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  editingPlan?.isPopular ? "bg-[#FF003C] border-[#FF003C]" : "bg-black border-white/10 group-hover:border-white/20"
                )}>
                  {editingPlan?.isPopular && <Check className="w-3 h-3 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={editingPlan?.isPopular || false} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, isPopular: e.target.checked })} 
                />
                Mark as Popular Plan
              </label>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TipsManager() {
  const [tips, setTips] = useState<HealthTip[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingTip, setEditingTip] = useState<Partial<HealthTip> | null>(null);
  const { uploadImage } = useImageUpload();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const path = 'health_tips';
    return onSnapshot(query(collection(db, path), orderBy('order')), (snapshot) => {
      setTips(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthTip)));
    }, (error) => handleDataError(error, OperationType.LIST, path));
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && (active as any).id !== (over as any).id) {
      const activeId = (active as any).id as string;
      const overId = (over as any).id as string;
      const oldIndex = tips.findIndex((t) => t.id === activeId);
      const newIndex = tips.findIndex((t) => t.id === overId);
      const newOrder = arrayMove(tips, oldIndex, newIndex);
      setTips(newOrder);
      const path = 'health_tips';
      try {
        const batch = newOrder.map((item: any, index) => 
          updateDoc(doc(db, path, item.id!), { order: index + 1 })
        );
        await Promise.all(batch);
        toast.success('Order updated');
      } catch (error) {
        handleDataError(error, OperationType.UPDATE, path);
      }
    }
  };

  const handleSave = async () => {
    if (!editingTip?.title || !editingTip?.content) {
      toast.error('Please fill in required fields');
      return;
    }
    const path = 'health_tips';
    try {
      if (editingTip.id) {
        const { id, ...data } = editingTip;
        await updateDoc(doc(db, path, id), data as any);
      } else {
        await addDoc(collection(db, path), { 
          ...editingTip, 
          createdAt: new Date().toISOString(),
          order: tips.length + 1 
        });
      }
      setIsModalOpen(false);
      setEditingTip(null);
      toast.success('Health tip saved');
    } catch (error) {
      handleDataError(error, editingTip.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    const path = 'health_tips';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('Tip deleted');
      setConfirmDelete(null);
    } catch (error) {
      handleDataError(error, OperationType.DELETE, path);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await uploadImage(file, 'tip');
      setEditingTip(prev => ({ ...prev, imageUrl: base64 }));
    }
  };

  return (
    <div className="space-y-10">
      <ConfirmModal 
        isOpen={!!confirmDelete}
        title="Delete Health Tip"
        message="Are you sure you want to delete this health tip? This action cannot be undone."
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter">Manage <span className="text-[#FF003C]">Health Tips</span></h1>
        <button
          onClick={() => { setEditingTip({ category: 'Nutrition' }); setIsModalOpen(true); }}
          className="bg-[#FF003C] text-white px-8 py-3 rounded-full font-black uppercase tracking-widest text-sm flex items-center gap-2 hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Tip
        </button>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tips.map(t => t.id!)} strategy={verticalListSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map((tip) => (
              <SortableItem key={tip.id} id={tip.id!}>
                <div className="bg-white/5 rounded-3xl border border-white/10 overflow-hidden group h-full">
                  <div className="aspect-video relative">
                    <img src={tip.imageUrl} alt={tip.title} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setEditingTip(tip); setIsModalOpen(true); }}
                        className="bg-black/80 p-2 rounded-lg hover:text-[#FF003C] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(tip.id!); }}
                        className="bg-black/80 p-2 rounded-lg hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#FF003C] mb-1">{tip.category}</div>
                    <h3 className="text-xl font-bold uppercase tracking-widest italic mb-2">{tip.title}</h3>
                    <p className="text-sm text-white/40 line-clamp-2">{tip.content}</p>
                  </div>
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#0A0A0A] border border-white/10 p-10 rounded-3xl w-full max-w-lg space-y-6">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">{editingTip?.id ? 'Edit' : 'Add'} Health Tip</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={editingTip?.title || ''}
                onChange={(e) => setEditingTip({ ...editingTip, title: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              />
              <select
                value={editingTip?.category}
                onChange={(e) => setEditingTip({ ...editingTip, category: e.target.value as any })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none"
              >
                <option value="Nutrition">Nutrition</option>
                <option value="Workout">Workout</option>
                <option value="Recovery">Recovery</option>
                <option value="Mindset">Mindset</option>
              </select>
              <textarea
                placeholder="Content"
                value={editingTip?.content || ''}
                onChange={(e) => setEditingTip({ ...editingTip, content: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#FF003C] outline-none h-32"
              />
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                  {editingTip?.imageUrl && <img src={editingTip.imageUrl} className="w-full h-full object-cover" />}
                </div>
                <label className="flex-grow bg-white/5 border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#FF003C] transition-colors">
                  <Upload className="w-5 h-5 text-white/40 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Upload Photo</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs border border-white/10 hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} className="flex-grow py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-[#FF003C] text-white hover:bg-white hover:text-[#FF003C] transition-all">Save Tip</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
