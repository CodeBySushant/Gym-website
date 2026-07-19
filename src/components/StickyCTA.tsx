import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { MessageCircle, Phone, ArrowRight } from 'lucide-react';
import { Setting } from '../types';
import { DEFAULTS } from '../config';

interface StickyCTAProps {
  settings: Setting | null;
}

export default function StickyCTA({ settings }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappNumber = settings?.whatsappNumber || DEFAULTS.whatsappNumber;
  const whatsappLink = settings?.whatsappLink || `https://wa.me/${whatsappNumber}`;
  const callNumber = settings?.callNumber || DEFAULTS.callNumber;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6 pointer-events-none"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 pointer-events-auto">
            <div className="hidden md:flex gap-4">
              {whatsappNumber && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <MessageCircle className="w-6 h-6" />
              </a>
              )}
              {callNumber && (
              <a
                href={`tel:${callNumber}`}
                aria-label="Call us"
                className="bg-[#FF003C] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform"
              >
                <Phone className="w-6 h-6" />
              </a>
              )}
            </div>

            <a
              href="#trial"
              className="flex-grow md:flex-grow-0 bg-[#FF003C] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,0,60,0.4)] hover:bg-white hover:text-[#FF003C] transition-all duration-300"
            >
              Book Free Trial
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
