import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, signInWithEmailAndPassword } from '../api';
import { Dumbbell, Mail, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../config';

interface LoginPageProps {
  user: UserProfile | null;
}

export default function LoginPage({ user }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 selection:bg-[#FF003C]">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-12 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Website</span>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-[#FF003C] p-4 rounded-2xl mb-6 shadow-[0_0_30px_rgba(255,0,60,0.3)]">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter text-center">
              Admin <span className="text-[#FF003C]">Panel</span>
            </h1>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-2">Enter credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C] outline-none transition-all"
                  placeholder={ADMIN_EMAIL}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  type="password"
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
              disabled={isLoading}
              className="w-full bg-[#FF003C] text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-[#FF003C] transition-all duration-500 shadow-[0_10px_30px_rgba(255,0,60,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-white/20 text-[10px] font-bold uppercase tracking-widest">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
