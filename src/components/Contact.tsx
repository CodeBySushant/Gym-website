import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, MessageCircle, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';
import { Setting } from '../types';
import { db, collection, addDoc, serverTimestamp } from '../api';
import { DEFAULTS } from '../config';
import { toast } from 'sonner';

interface ContactProps {
  settings: Setting | null;
}

export default function Contact({ settings }: ContactProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState(''); // honeypot — humans never fill this
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const whatsappNumber = settings?.whatsappNumber || DEFAULTS.whatsappNumber;
  const whatsappLink = settings?.whatsappLink || `https://wa.me/${whatsappNumber}`;
  const callNumber = settings?.callNumber || DEFAULTS.callNumber;
  const address = settings?.address || DEFAULTS.address;
  const openHours = settings?.openHours || DEFAULTS.openHours;

  // Two Google Maps formats work inside an iframe:
  //   1. Share -> Embed a map -> copy the src  (contains "/embed?pb=")
  //   2. Keyless search embed                  (contains "output=embed")
  // Anything else (a normal maps.google.com link) is refused by Google's
  // X-Frame-Options, so we hide the map rather than render a broken box.
  const rawMapsUrl = settings?.googleMapsUrl || DEFAULTS.googleMapsUrl;
  const mapsUrl =
    rawMapsUrl && (rawMapsUrl.includes('/embed') || rawMapsUrl.includes('output=embed'))
      ? rawMapsUrl
      : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: bots fill hidden fields — silently pretend success.
    if (website) {
      setIsSubmitted(true);
      return;
    }

    const trimmedName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!trimmedName) {
      toast.error('Please enter your name');
      return;
    }
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast.error('Please enter a valid phone number (10\u201315 digits)');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leads'), {
        name: trimmedName,
        phone: cleanPhone,
        status: 'new',
        createdAt: serverTimestamp(),
      });
      setIsSubmitted(true);
      toast.success('Trial booked successfully!');
    } catch (error) {
      console.error('Error booking trial:', error);
      toast.error('Failed to book trial. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-black overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left: Info & Form */}
          <div id="trial">
            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-8"
            >
              Book Your <span className="text-[#FF003C]">Free Trial</span>
            </motion.h2>
            
            {!isSubmitted ? (
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onSubmit={handleSubmit}
                className="bg-white/5 p-10 rounded-3xl border border-white/10 mb-12"
              >
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#FF003C] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-white/40 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-[#FF003C] focus:outline-none transition-colors"
                    />
                  </div>
                  {/* Honeypot field — invisible to humans, catches bots */}
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#FF003C] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white hover:text-[#FF003C] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing...' : 'Claim Free Trial'}
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/5 p-10 rounded-3xl border border-[#FF003C] mb-12 text-center"
              >
                <CheckCircle2 className="w-16 h-16 text-[#FF003C] mx-auto mb-6" />
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Request Received!</h3>
                <p className="text-white/60 font-medium">
                  We will contact you shortly to confirm your trial. Get ready to transform!
                </p>
              </motion.div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {callNumber && (
              <a
                href={`tel:${callNumber}`}
                className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-[#FF003C]/50 transition-colors"
              >
                <div className="bg-[#FF003C] p-3 rounded-xl">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40">Call Us</div>
                  <div className="font-black italic text-lg">+{callNumber}</div>
                </div>
              </a>
              )}
              {whatsappNumber && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 hover:border-[#FF003C]/50 transition-colors"
              >
                <div className="bg-green-500 p-3 rounded-xl">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40">WhatsApp</div>
                  <div className="font-black italic text-lg">Chat Now</div>
                </div>
              </a>
              )}
            </div>
          </div>

          {/* Right: Map & Location */}
          <div className="flex flex-col h-full">
            <div className="bg-white/5 p-8 rounded-3xl border border-white/10 mb-8">
              {address && (
              <div className="flex items-start gap-4 mb-6">
                <MapPin className="w-6 h-6 text-[#FF003C] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Our Location</div>
                  <div className="font-bold text-lg leading-tight">{address}</div>
                </div>
              </div>
              )}
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-[#FF003C] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Open Hours</div>
                  <div className="font-bold text-lg">{openHours}</div>
                </div>
              </div>
            </div>
            
            {mapsUrl && (
              <div className="flex-grow min-h-[300px] rounded-3xl overflow-hidden border border-white/10 hover:border-white/25 transition-colors duration-300">
                <iframe
                  src={mapsUrl}
                  title="Gym location on Google Maps"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
