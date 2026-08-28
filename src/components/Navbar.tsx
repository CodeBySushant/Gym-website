import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Dumbbell, UserCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { BRAND } from '../config';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'Services', href: '#services' },
    { name: 'Gallery', href: '#gallery' },
    { name: 'Trainers', href: '#trainers' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4',
        isScrolled ? 'bg-black/90 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-[#FF003C] p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter uppercase italic">
            {BRAND.first} <span className="text-[#FF003C]">{BRAND.accentShort}</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium uppercase tracking-widest hover:text-[#FF003C] transition-colors"
            >
              {link.name}
            </a>
          ))}
          <Link
            to="/member/login"
            title="Member login"
            className="flex items-center gap-2 border-2 border-[#FF003C] text-[#FF003C] px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#FF003C] hover:text-white transition-all duration-300"
          >
            <UserCircle className="w-4 h-4" />
            Login
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="md:hidden text-white" aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-black border-b border-white/10 p-6 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-lg font-bold uppercase tracking-widest hover:text-[#FF003C]"
                >
                  {link.name}
                </a>
              ))}
              <Link
                to="/member/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-center gap-2 mt-2 border-2 border-[#FF003C] text-[#FF003C] px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest"
              >
                <UserCircle className="w-4 h-4" />
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
