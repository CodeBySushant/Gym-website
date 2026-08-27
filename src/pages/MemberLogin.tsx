import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, Phone, Lock, ArrowLeft, Loader2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Member } from '../types';
import { memberLogin } from '../memberApi';
import { BRAND, DEFAULTS } from '../config';

export default function MemberLogin({ member }: { member: Member | null }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (member) navigate('/member', { replace: true });
  }, [member, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) { toast.error('Please enter a valid phone number'); return; }
    if (!password) { toast.error('Please enter your password'); return; }

    setLoading(true);
    try {
      await memberLogin(clean, password);
      toast.success('Welcome back');
      navigate('/member', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const helpLink = DEFAULTS.whatsappNumber
    ? `https://wa.me/${DEFAULTS.whatsappNumber}?text=${encodeURIComponent("Hi, I need help logging into my member account.")}`
    : '';

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-[#FF003C] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,0,60,0.14),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-10 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Website</span>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 sm:p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center mb-9">
            <div className="bg-[#FF003C] p-4 rounded-2xl mb-6 shadow-[0_0_40px_rgba(255,0,60,0.35)]">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-center leading-none">
              Member <span className="text-[#FF003C]">Portal</span>
            </h1>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em] mt-3 text-center">
              {BRAND.full}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="m-phone" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="m-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] outline-none transition-all"
                  placeholder="Registered mobile number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="m-pass" className="block text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  id="m-pass"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF003C] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-[#FF003C] transition-all duration-500 shadow-[0_10px_30px_rgba(255,0,60,0.25)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>) : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-white/35 leading-relaxed">
              Don&rsquo;t have login details? Your account is created by the gym.
              {helpLink ? (
                <>
                  {' '}
                  <a
                    href={helpLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#FF003C] hover:text-white transition-colors font-bold inline-flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" /> Message us
                  </a>
                </>
              ) : (
                ' Ask at the front desk.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
