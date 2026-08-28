import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';
import { MessageCircle, Phone } from 'lucide-react';
import { Setting } from '../types';
import { DEFAULTS } from '../config';

interface StickyCTAProps {
  settings: Setting | null;
}

/**
 * Floating contact buttons, bottom-right, once the visitor has scrolled past
 * the hero. WhatsApp and call only — the "Book Free Trial" button was removed
 * because the same CTA already appears in the hero, pricing and contact
 * sections.
 */
export default function StickyCTA({ settings }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const whatsappNumber = settings?.whatsappNumber || DEFAULTS.whatsappNumber;
  const whatsappLink = settings?.whatsappLink || `https://wa.me/${whatsappNumber}`;
  const callNumber = settings?.callNumber || DEFAULTS.callNumber;

  // Nothing to show if neither contact method is configured.
  if (!whatsappNumber && !callNumber) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-6 pointer-events-none"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-end gap-3 md:gap-4 pointer-events-auto">
            {whatsappNumber && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                aria-label="Chat on WhatsApp"
                title="Chat on WhatsApp"
                className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <MessageCircle className="w-6 h-6" />
              </a>
            )}
            {callNumber && (
              <a
                href={`tel:+${callNumber}`}
                aria-label="Call the gym"
                title="Call the gym"
                className="bg-[#FF003C] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Phone className="w-6 h-6" />
              </a>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
