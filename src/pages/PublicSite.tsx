import { useEffect, useState } from 'react';
import { collection, query, orderBy, db, limit, getDocs } from '../api';
import { Setting, Service, Trainer, Testimonial, GalleryItem, PricingPlan, HealthTip } from '../types';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import SocialProof from '../components/SocialProof';
import Services from '../components/Services';
import Gallery from '../components/Gallery';
import Trainers from '../components/Trainers';
import Pricing from '../components/Pricing';
import HealthTips from '../components/HealthTips';
import Contact from '../components/Contact';
import FAQ from '../components/FAQ';
import Footer from '../components/Footer';

// Bump this when the data shape changes to invalidate old caches.
const CACHE_VERSION = 'v2';

/** Safe localStorage cache — never throws, versioned, self-cleaning. */
export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${CACHE_VERSION}_${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(`${CACHE_VERSION}_${key}`, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage unavailable — the site works fine without cache.
  }
}

export default function PublicSite() {
  // null = still loading; [] / {} = loaded but empty
  const [settings, setSettings] = useState<Setting | null>(() => readCache<Setting>('gym_settings'));
  const [services, setServices] = useState<Service[] | null>(() => readCache<Service[]>('gym_services'));
  const [trainers, setTrainers] = useState<Trainer[] | null>(() => readCache<Trainer[]>('gym_trainers'));
  const [testimonials, setTestimonials] = useState<Testimonial[] | null>(() => readCache<Testimonial[]>('gym_testimonials'));
  const [gallery, setGallery] = useState<GalleryItem[] | null>(() => readCache<GalleryItem[]>('gym_gallery'));
  const [pricing, setPricing] = useState<PricingPlan[] | null>(() => readCache<PricingPlan[]>('gym_pricing'));
  const [tips, setTips] = useState<HealthTip[] | null>(() => readCache<HealthTip[]>('gym_tips'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const settingsSnap = await getDocs(collection(db, 'settings'));
        if (!settingsSnap.empty) {
          const data = { id: settingsSnap.docs[0].id, ...settingsSnap.docs[0].data() } as Setting;
          setSettings(data);
          writeCache('gym_settings', data);
        } else {
          setSettings({} as Setting); // loaded, empty — components fall back to defaults
        }

        const servicesSnap = await getDocs(query(collection(db, 'services'), orderBy('order'), limit(50)));
        const servicesData = servicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
        setServices(servicesData);
        writeCache('gym_services', servicesData);

        const trainersSnap = await getDocs(query(collection(db, 'trainers'), limit(20)));
        const trainersData = trainersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trainer));
        setTrainers(trainersData);
        writeCache('gym_trainers', trainersData);

        const testimonialsSnap = await getDocs(query(collection(db, 'testimonials'), limit(50)));
        const testimonialsData = testimonialsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Testimonial));
        setTestimonials(testimonialsData);
        writeCache('gym_testimonials', testimonialsData);

        const gallerySnap = await getDocs(query(collection(db, 'gallery'), limit(100)));
        const galleryData = gallerySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        setGallery(galleryData);
        writeCache('gym_gallery', galleryData);

        const pricingSnap = await getDocs(query(collection(db, 'pricing'), orderBy('order'), limit(20)));
        const pricingData = pricingSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingPlan));
        setPricing(pricingData);
        writeCache('gym_pricing', pricingData);

        // Ordered by 'order' to match the drag-and-drop sorting in the admin panel.
        const tipsSnap = await getDocs(query(collection(db, 'health_tips'), orderBy('order'), limit(20)));
        const tipsData = tipsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthTip));
        setTips(tipsData);
        writeCache('gym_tips', tipsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-[#FF003C] selection:text-white">
      <Navbar />
      <main>
        <Hero settings={settings} />
        <SocialProof testimonials={testimonials} />
        <Services services={services} settings={settings} />
        <Gallery items={gallery} />
        <Trainers trainers={trainers} />
        <Pricing plans={pricing} />
        <HealthTips tips={tips} />
        <FAQ />
        <Contact settings={settings} />
      </main>
      <Footer settings={settings} />
    </div>
  );
}
