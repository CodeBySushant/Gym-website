import { useState, useEffect } from 'react';
import { Dumbbell, Instagram, Facebook, Twitter, Youtube, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, signOut } from '../api';
import { Setting } from '../types';
import { BRAND, SOCIALS, CONTACT_EMAIL, DEFAULTS } from '../config';
import { toast } from 'sonner';

interface FooterProps {
  settings: Setting | null;
}

export default function Footer({ settings }: FooterProps) {
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    toast.success('Logged out successfully');
  };

  // Fall back to config so the footer is never blank on a fresh database.
  const address = settings?.address || DEFAULTS.address;
  const callNumber = settings?.callNumber || DEFAULTS.callNumber;
  const openHours = settings?.openHours || DEFAULTS.openHours;

  const socialLinks = [
    { Icon: Instagram, url: SOCIALS.instagram, label: 'Instagram' },
    { Icon: Facebook, url: SOCIALS.facebook, label: 'Facebook' },
    { Icon: Twitter, url: SOCIALS.twitter, label: 'Twitter / X' },
    { Icon: Youtube, url: SOCIALS.youtube, label: 'YouTube' },
  ].filter(s => s.url);

  const quickLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Trainers', href: '#trainers' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <footer className="bg-[#050505] border-t border-white/10 py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-[#FF003C] p-2 rounded-lg">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter uppercase italic">
                {BRAND.first} <span className="text-[#FF003C]">{BRAND.accent}</span>
              </span>
            </div>
            <p className="text-white/40 max-w-md font-medium leading-relaxed mb-8">
              {BRAND.tagline}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map(({ Icon, url, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#FF003C] hover:border-[#FF003C] transition-all duration-300"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8">Quick Links</h4>
            <ul className="space-y-4">
              {quickLinks.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="text-white/40 hover:text-[#FF003C] transition-colors font-medium"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-8">Contact</h4>
            <ul className="space-y-4">
              {address && <li className="text-white/40 font-medium">{address}</li>}
              {callNumber && (
                <li>
                  <a
                    href={`tel:+${callNumber}`}
                    className="text-white/40 hover:text-[#FF003C] transition-colors font-medium"
                  >
                    +{callNumber}
                  </a>
                </li>
              )}
              {openHours && <li className="text-white/40 font-medium">{openHours}</li>}
              {CONTACT_EMAIL && (
                <li className="text-white/40 font-medium">{CONTACT_EMAIL}</li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/20 text-xs font-bold uppercase tracking-widest">
            © {currentYear} {BRAND.full}. All Rights Reserved.
          </p>
          <div className="flex gap-8 items-center">
            <Link to="/privacy" className="text-white/20 hover:text-white text-xs font-bold uppercase tracking-widest">Privacy Policy</Link>
            <Link to="/terms" className="text-white/20 hover:text-white text-xs font-bold uppercase tracking-widest">Terms of Service</Link>
            <div className="h-4 w-px bg-white/10" />
            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/admin"
                  className="text-white/20 hover:text-[#FF003C] text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <Lock className="w-3 h-3" />
                  Admin Panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-white/20 hover:text-white text-xs font-bold uppercase tracking-widest"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="text-white/20 hover:text-[#FF003C] text-xs font-bold uppercase tracking-widest flex items-center gap-2"
              >
                <Lock className="w-3 h-3" />
                Admin Panel
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
