import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BRAND, CONTACT_EMAIL } from '../config';

interface LegalPageProps {
  kind: 'privacy' | 'terms';
}

/**
 * Basic legal pages. These are generic starter templates —
 * review and customize them for the actual business before going live.
 */
export default function LegalPage({ kind }: LegalPageProps) {
  const isPrivacy = kind === 'privacy';
  return (
    <div className="min-h-screen bg-black text-white p-6 py-20">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Website</span>
        </Link>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-10">
          {isPrivacy ? <>Privacy <span className="text-[#FF003C]">Policy</span></> : <>Terms of <span className="text-[#FF003C]">Service</span></>}
        </h1>

        {isPrivacy ? (
          <div className="space-y-6 text-white/60 leading-relaxed">
            <p><b className="text-white">What we collect.</b> When you book a free trial through our website, we collect your name and phone number so that our team can contact you about your visit.</p>
            <p><b className="text-white">How we use it.</b> Your details are used only to respond to your enquiry and manage your membership with {BRAND.full}. We do not sell or share your personal information with third parties for marketing.</p>
            <p><b className="text-white">Where it's stored.</b> Data is stored securely on Google Firebase infrastructure and is accessible only to authorized gym staff.</p>
            <p><b className="text-white">Your rights.</b> You can ask us to delete your contact details at any time by reaching out to the gym directly{CONTACT_EMAIL ? ` at ${CONTACT_EMAIL}` : ''}.</p>
            <p className="text-white/30 text-sm">Last updated: {new Date().getFullYear()}. This is a general template — please review it with the gym's own policies before relying on it.</p>
          </div>
        ) : (
          <div className="space-y-6 text-white/60 leading-relaxed">
            <p><b className="text-white">Memberships.</b> Membership plans, pricing, and durations are as listed on this website and at the front desk. Fees are payable in advance and are non-transferable.</p>
            <p><b className="text-white">Free trials.</b> Free trial bookings are subject to confirmation by our team and available to first-time visitors only.</p>
            <p><b className="text-white">Health & safety.</b> Members are responsible for consulting a physician before beginning any exercise program and must follow staff instructions and posted safety guidelines while on the premises.</p>
            <p><b className="text-white">Conduct.</b> {BRAND.full} reserves the right to refuse or revoke membership for behavior that endangers or disrupts other members.</p>
            <p className="text-white/30 text-sm">Last updated: {new Date().getFullYear()}. This is a general template — please review it with the gym's own policies before relying on it.</p>
          </div>
        )}
      </div>
    </div>
  );
}
