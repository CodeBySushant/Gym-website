import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BRAND } from '../config';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 text-center">
      <div>
        <div className="text-8xl font-black italic text-[#FF003C] mb-4">404</div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-6">
          Page Not <span className="text-[#FF003C]">Found</span>
        </h1>
        <p className="text-white/50 mb-10">This page doesn't exist at {BRAND.full}.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-[#FF003C] text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-[#FF003C] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
