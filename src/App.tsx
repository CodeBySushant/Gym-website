import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { restoreSession, onAuthStateChanged, auth, SessionUser } from './api';
import { restoreMemberSession, onMemberChanged } from './memberApi';
import { UserProfile, Member } from './types';
import PublicSite from './pages/PublicSite';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound';
import LegalPage from './pages/LegalPage';
import { Toaster } from 'sonner';

// Code-split: visitors don't download the admin panel.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const MemberPortal = lazy(() => import('./pages/MemberPortal'));
const MemberLogin = lazy(() => import('./pages/MemberLogin'));

function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF003C]" />
    </div>
  );
}

function toProfile(u: SessionUser): UserProfile {
  return { uid: u.uid, email: u.email, displayName: u.displayName, role: u.role };
}

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin and member sessions are independent — restore both, then stay in
    // sync with their respective login/logout events.
    Promise.allSettled([restoreSession(), restoreMemberSession()]).finally(() => setLoading(false));
    const unsubAdmin = onAuthStateChanged(auth, (u) => setUser(u ? toProfile(u) : null));
    const unsubMember = onMemberChanged(setMember);
    return () => { unsubAdmin(); unsubMember(); };
  }, []);

  if (loading) return <Spinner />;

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/" element={<PublicSite />} />
          <Route path="/login" element={<LoginPage user={user} />} />
          <Route path="/member/login" element={<MemberLogin member={member} />} />
          <Route
            path="/member"
            element={member ? <MemberPortal member={member} /> : <Navigate to="/member/login" replace />}
          />
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute user={user} requiredRole="admin">
                <AdminDashboard user={user} />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
