import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, orderBy, db, limit, getDocs } from '../api';
import { FAQ as FAQType } from '../types';
import Skeleton from './Skeleton';
import { readCache, writeCache } from '../pages/PublicSite';

export default function FAQ() {
  const [faqs, setFaqs] = useState<FAQType[] | null>(() => readCache<FAQType[]>('gym_faqs'));
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const snapshot = await getDocs(query(collection(db, 'faqs'), orderBy('order'), limit(50)));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FAQType));
        setFaqs(data);
        writeCache('gym_faqs', data);
      } catch (error) {
        console.error("Error fetching FAQs:", error);
      }
    };
    fetchFaqs();
  }, []);

  const isLoading = faqs === null;
  const displayFaqs = faqs || [];

  if (!isLoading && displayFaqs.length === 0) return null;

  return (
    <section className="py-24 bg-black overflow-hidden">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter mb-12 text-center">
          Common <span className="text-[#FF003C]">Questions</span>
        </h2>
        
        <div className="space-y-4">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i}><Skeleton className="h-20 w-full" /></div>
            ))
          ) : displayFaqs.map((faq, i) => (
            <div
              key={faq.id || i}
              className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-8 py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-lg font-bold uppercase tracking-widest italic">{faq.question}</span>
                {openIndex === i ? (
                  <Minus className="w-5 h-5 text-[#FF003C]" />
                ) : (
                  <Plus className="w-5 h-5 text-white/40" />
                )}
              </button>
              
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-8 pb-6 text-white/60 font-medium leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
