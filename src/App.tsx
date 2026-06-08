import { useState, useEffect, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { handle301Redirects } from './lib/slugUtils';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ChatWidget from './components/ChatWidget';
import WhatsAppButton from './components/WhatsAppButton';
import FaviconUpdater from './components/FaviconUpdater';
import TrackingInjector from './components/TrackingInjector';

// Lazy load pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const CallbackPage = lazy(() => import('./pages/auth/CallbackPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EnhancedCustomerPortal = lazy(() => import('./pages/customer/EnhancedCustomerPortal'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const GamesPage = lazy(() => import('./pages/public/GamesPage'));
const GameDetailPage = lazy(() => import('./pages/public/GameDetailPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const OrderVideoPage = lazy(() => import('./pages/public/OrderVideoPage'));
const PublicBookingPage = lazy(() => import('./pages/public/PublicBookingPage'));
const MerchandiseStore = lazy(() => import('./pages/public/MerchandiseStore'));
const LobbyGamesPage = lazy(() => import('./pages/public/LobbyGamesPage'));
const StaticPage = lazy(() => import('./pages/public/StaticPage'));
const BlogPage = lazy(() => import('./pages/public/BlogPage'));
const BlogDetailPage = lazy(() => import('./pages/public/BlogDetailPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/public/PrivacyPolicyPage'));
const WaiverPage = lazy(() => import('./pages/public/WaiverPage'));
const PaymentSuccessPage = lazy(() => import('./pages/public/PaymentSuccessPage'));
const PaymentCancelPage = lazy(() => import('./pages/public/PaymentCancelPage'));
const MPGSReturnPage = lazy(() => import('./pages/payment/mpgs/Return'));
const MPGSCancelPage = lazy(() => import('./pages/payment/mpgs/Cancel'));
const MPGSTimeoutPage = lazy(() => import('./pages/payment/mpgs/Timeout'));

function AppContent() {
  const { user, profile, loading, isAdmin, isCustomer } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname;
    if (path === '/') {
      return 'home';
    }

    // Check for redirects
    const redirectPath = handle301Redirects(path);
    if (redirectPath) {
      window.history.replaceState({}, '', redirectPath);
      // Recalculate page based on new path
      // Ideally we would return the state corresponding to the new path
      // For now let's just update the path and let the next logic handle it or simple reload
      // But since we are inside useState initializer, we need to return the correct state.
      // Let's recursively call logic or just map manually.
      // To keep it simple, we will use the same logic as below for the new path.
      // But simpler:
       if (redirectPath === '/') return 'home';
       if (redirectPath.startsWith('/game/')) return redirectPath;
       if (redirectPath.startsWith('/blog/')) return redirectPath;
       // ... add others if needed
    }

    if (path === '/home') {
      window.history.replaceState({}, '', '/');
      return 'home';
    }
    if (path === '/privacy-policy') return 'privacy-policy';
    if (path === '/waiver') return 'waiver';
    if (path.startsWith('/game/')) return path;
    if (path.startsWith('/page/')) return path;
    if (path.startsWith('/blog/')) return path;
    if (path.startsWith('/games')) return 'games';
    if (path.startsWith('/lobby-games')) return 'lobby-games';
    if (path.startsWith('/merchandise')) return 'merchandise';
    if (path.startsWith('/blog')) return 'blog';
    if (path.startsWith('/about')) return 'about';
    if (path.startsWith('/contact')) return 'contact';
    if (path.startsWith('/order-video')) return 'order-video';
    if (path.startsWith('/book')) return 'book';
    if (path.startsWith('/payment/success')) return 'payment-success';
    if (path.startsWith('/payment/cancel')) return 'payment-cancel';
    if (path.startsWith('/payment/mpgs/return')) return 'payment-mpgs-return';
    if (path.startsWith('/payment/mpgs/cancel')) return 'payment-mpgs-cancel';
    if (path.startsWith('/payment/mpgs/timeout')) return 'payment-mpgs-timeout';
    if (path.startsWith('/reset-password')) return 'reset-password';
    if (path.startsWith('/login')) return 'login';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/customer')) return 'customer';
    return 'home';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/') {
        setCurrentPage('home');
      } else if (path === '/home') {
        window.history.replaceState({}, '', '/');
        setCurrentPage('home');
      } else if (path === '/privacy-policy') {
        setCurrentPage('privacy-policy');
      } else if (path === '/waiver' || path === '/page/waiver-policy') {
        setCurrentPage('waiver');
      } else if (path.startsWith('/game/')) {
        setCurrentPage(path);
      } else if (path.startsWith('/page/')) {
        setCurrentPage(path);
      } else if (path.startsWith('/blog/')) {
        setCurrentPage(path);
      } else if (path.startsWith('/games')) {
        setCurrentPage('games');
      } else if (path.startsWith('/lobby-games')) {
        setCurrentPage('lobby-games');
      } else if (path.startsWith('/merchandise')) {
        setCurrentPage('merchandise');
      } else if (path.startsWith('/blog')) {
        setCurrentPage('blog');
      } else if (path.startsWith('/about')) {
        setCurrentPage('about');
      } else if (path.startsWith('/contact')) {
        setCurrentPage('contact');
      } else if (path.startsWith('/order-video')) {
        setCurrentPage('order-video');
      } else if (path.startsWith('/book')) {
        setCurrentPage('book');
      } else if (path.startsWith('/payment/success')) {
        setCurrentPage('payment-success');
      } else if (path.startsWith('/payment/cancel')) {
        setCurrentPage('payment-cancel');
      } else if (path.startsWith('/payment/mpgs/return')) {
        setCurrentPage('payment-mpgs-return');
      } else if (path.startsWith('/payment/mpgs/cancel')) {
        setCurrentPage('payment-mpgs-cancel');
      } else if (path.startsWith('/payment/mpgs/timeout')) {
        setCurrentPage('payment-mpgs-timeout');
      } else if (path.startsWith('/reset-password')) {
        setCurrentPage('reset-password');
      } else if (path.startsWith('/login')) {
        setCurrentPage('login');
      } else if (path.startsWith('/admin')) {
        setCurrentPage('admin');
      } else if (path.startsWith('/customer')) {
        setCurrentPage('customer');
      } else {
        setCurrentPage('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!loading && user && profile) {
      if (isAdmin) {
        if (currentPage === 'home' || currentPage === 'login') {
          setCurrentPage('admin');
        }
      } else if (isCustomer) {
        if (currentPage === 'login') {
          setCurrentPage('home');
        }
      }
    }

    if (!loading && !user && (currentPage === 'admin' || currentPage === 'customer')) {
      setCurrentPage('login');
    }
  }, [user, profile, loading, currentPage, isAdmin, isCustomer]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const handleNavigation = (page: string) => {
    setCurrentPage(page);

    let newPath: string;
    if (page.startsWith('/game/') || page.startsWith('/page/') || page.startsWith('/blog/')) {
      newPath = page;
    } else {
      const pathMap: { [key: string]: string } = {
        'home': '/',
        'games': '/games',
        'lobby-games': '/lobby-games',
        'merchandise': '/merchandise',
        'blog': '/blog',
        'about': '/about',
        'contact': '/contact',
        'order-video': '/order-video',
        'book': '/book',
        'login': '/login',
        'admin': '/admin',
        'customer': '/customer',
        'privacy-policy': '/privacy-policy',
        'waiver': '/waiver',
        'payment-success': '/payment/success',
        'payment-cancel': '/payment/cancel',
        'payment-mpgs-return': '/payment/mpgs/return',
        'payment-mpgs-cancel': '/payment/mpgs/cancel',
        'payment-mpgs-timeout': '/payment/mpgs/timeout',
        'reset-password': '/reset-password'
      };
      newPath = pathMap[page] || '/';
    }

    if (window.location.pathname !== newPath) {
      window.history.pushState({}, '', newPath);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (currentPage === 'login') {
    return <LoginPage onNavigate={handleNavigation} />;
  }

  if (currentPage === 'auth-callback') {
    return <CallbackPage onNavigate={handleNavigation} />;
  }

  if (currentPage === 'reset-password') {
    return <ResetPasswordPage onNavigate={handleNavigation} />;
  }

  if (currentPage === 'admin' && user && isAdmin) {
    return <AdminDashboard />;
  }

  if (currentPage === 'customer' && user && profile) {
    return <EnhancedCustomerPortal onNavigate={handleNavigation} />;
  }

  const renderPublicPage = () => {
    if (currentPage.startsWith('/game/')) {
      const gameSlug = currentPage.replace('/game/', '');
      return <GameDetailPage gameSlug={gameSlug} onNavigate={handleNavigation} />;
    }

    if (currentPage.startsWith('/page/')) {
      const pageSlug = currentPage.replace('/page/', '');
      return <StaticPage slug={pageSlug} onNavigate={handleNavigation} />;
    }

    if (currentPage.startsWith('/blog/')) {
      const blogSlug = currentPage.replace('/blog/', '');
      return <BlogDetailPage slug={blogSlug} onNavigate={handleNavigation} />;
    }

    switch (currentPage) {
      case 'home':
        return <LandingPage onNavigate={handleNavigation} />;
      case 'games':
        return <GamesPage onNavigate={handleNavigation} />;
      case 'lobby-games':
        return <LobbyGamesPage onNavigate={handleNavigation} />;
      case 'merchandise':
        return <MerchandiseStore onNavigate={handleNavigation} />;
      case 'blog':
        return <BlogPage onNavigate={handleNavigation} />;
      case 'about':
        return <AboutPage onNavigate={handleNavigation} />;
      case 'contact':
        return <ContactPage onNavigate={handleNavigation} />;
      case 'privacy-policy':
        return <PrivacyPolicyPage onNavigate={handleNavigation} />;
      case 'waiver':
        return <WaiverPage onNavigate={handleNavigation} />;
      case 'order-video':
        return <OrderVideoPage onNavigate={handleNavigation} />;
      case 'book':
        return <PublicBookingPage onNavigate={handleNavigation} />;
      case 'payment-success':
        return <PaymentSuccessPage />;
      case 'payment-cancel':
        return <PaymentCancelPage />;
      case 'payment-mpgs-return':
        return <MPGSReturnPage />;
      case 'payment-mpgs-cancel':
        return <MPGSCancelPage />;
      case 'payment-mpgs-timeout':
        return <MPGSTimeoutPage />;
      default:
        return <LandingPage onNavigate={handleNavigation} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <FaviconUpdater />
      <TrackingInjector />
      <Navigation onNavigate={handleNavigation} currentPage={currentPage} />
      <main className="flex-1 pt-24">
        {renderPublicPage()}
      </main>
      <Footer onNavigate={handleNavigation} />
      <ChatWidget />
      <WhatsAppButton />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
