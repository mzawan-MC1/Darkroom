import { useState, useEffect } from 'react';
import { Menu, X, Lock, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface NavigationProps {
  onNavigate: (page: string) => void;
  currentPage?: string;
}

interface StaticPage {
  id: string;
  title: string;
  slug: string;
  page_type: string;
}

export default function Navigation({ onNavigate, currentPage = 'home' }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [staticPages, setStaticPages] = useState<StaticPage[]>([]);
  const [navLinks, setNavLinks] = useState<{ name: string; path: string; enabled?: boolean; children?: { name: string; path: string; enabled?: boolean }[] }[]>([
    { name: 'HOME', path: 'home', enabled: true },
    { name: 'Games', path: 'games', enabled: true },
    { name: 'Lobby Games', path: 'lobby-games', enabled: true },
    { name: 'Order Video', path: 'order-video', enabled: true },
    { name: 'Contact', path: 'contact', enabled: true },
    { name: 'Merchandise', path: 'merchandise', enabled: true },
    { name: 'Blog', path: 'blog', enabled: true },
    { name: 'About', path: 'about', enabled: true },
  ]);
  const { user, profile, isAdmin } = useAuth();

  useEffect(() => {
    loadSiteSettings();
    loadStaticPages();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('site-settings-nav')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          loadSiteSettings();
        }
      )
      .subscribe();
    return () => {
      // @ts-ignore
      if (channel) {
        try { (channel as any).unsubscribe?.(); } catch {}
        try { (supabase as any).removeChannel?.(channel); } catch {}
      }
    };
  }, []);

  const loadSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: any = {};
      data?.forEach((item: any) => {
        const key = item.setting_key;
        const value = item.setting_value;
        if (key === 'header_menu_links') {
          settingsObj[key] = Array.isArray(value) ? value : [];
        } else {
          if (value && typeof value === 'object' && 'value' in value) {
            settingsObj[key] = value.value;
          } else {
            settingsObj[key] = value;
          }
        }
      });
      setSiteSettings(settingsObj);

      const normalizedLinks = (links: any[]) =>
        Array.isArray(links)
          ? links
              .map((l) => ({
                name: l.label || 'Link',
                path: l.page || 'home',
                enabled: l.enabled !== false,
                children: Array.isArray(l.children)
                  ? l.children
                      .map((c: any) => ({ name: c.label || 'Link', path: c.page || 'home', enabled: c.enabled !== false }))
                      .filter((c: any) => !!c.path)
                  : undefined,
              }))
              .filter((l) => !!l.path)
          : null;

      const fromSettings = normalizedLinks(settingsObj.header_menu_links);
      if (fromSettings && fromSettings.length) {
        setNavLinks(fromSettings);
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
    }
  };

  const loadStaticPages = async () => {
    try {
      const { data, error } = await supabase
        .from('static_pages')
        .select('id, title, slug, page_type')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      setStaticPages(data || []);
    } catch (error) {
      console.error('Error loading static pages:', error);
    }
  };

  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex?.replace('#', '') || '1f2937';
    const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
  };

  const preset = (siteSettings.header_menu_preset || 'dark') as 'light' | 'dark';
  const bgColor = hexToRgba(siteSettings.header_menu_bg_color || (preset === 'light' ? '#ffffff' : '#05060a'), Number(siteSettings.header_menu_bg_opacity ?? 0.86));
  const textColor = siteSettings.header_menu_text_color || (preset === 'light' ? '#111827' : '#cbd5e1');
  const hoverColor = siteSettings.header_menu_hover_color || (preset === 'light' ? '#0ea5e9' : '#fb7185');
  const activeColor = siteSettings.header_menu_active_color || '#ffffff';
  const companyName = siteSettings.company_name || 'DarkRoom';

  const submenuContainerBg = bgColor;

  const handleNavigation = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: bgColor }}>
      <div className="backdrop-blur-md shadow-lg" style={{ backgroundColor: bgColor }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
          <div className="flex items-center">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNavigation('home');
              }}
              className="flex items-center space-x-3"
            >
              {siteSettings.logo_url ? (
                <img
                  src={siteSettings.logo_url}
                  alt={siteSettings.company_name || 'Logo'}
                  className="h-20 w-auto"
                />
              ) : siteSettings.company_name ? (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border border-red-900/40 bg-black/30 shadow-red-glow">
                    <Lock className="w-7 h-7 text-primary-200" />
                  </div>
                  <span className="text-2xl font-bold uppercase tracking-wider text-white font-display">
                    {companyName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center border border-red-900/40 bg-black/30 shadow-red-glow">
                    <Lock className="w-7 h-7 text-primary-200" />
                  </div>
                  <span className="text-2xl font-bold uppercase tracking-wider text-white font-display">
                    {companyName}
                  </span>
                </div>
              )}
            </a>
          </div>

          <div className="hidden lg:block">
            <div className="flex items-center space-x-8">
              {navLinks.filter((l) => l.enabled !== false).map((link) => (
                <div key={link.path} className="relative group">
                  <a
                    href={`/${link.path}`}
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavigation(link.path);
                    }}
                    className={`text-sm font-medium tracking-wider transition-colors relative`}
                    style={{ color: currentPage === link.path ? activeColor : textColor }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = hoverColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = currentPage === link.path ? activeColor : textColor)}
                  >
                    {link.name}
                    <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-primary-500 transition-transform origin-left ${
                      currentPage === link.path ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                    }`}></span>
                  </a>
                  {link.children && link.children.length > 0 && (
                    <div className="absolute left-0 mt-3 w-56 rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto" style={{ backgroundColor: submenuContainerBg }}>
                      <div className="py-2">
                        {link.children.filter((c) => c.enabled !== false).map((child) => (
                          <a
                            key={`${link.path}-${child.path}`}
                            href={`/${child.path}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavigation(child.path);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm transition-colors"
                            style={{ color: currentPage === child.path ? activeColor : textColor }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = hoverColor; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = currentPage === child.path ? activeColor : textColor; }}
                          >
                            {child.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="relative">
                <button
                  onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
                  className="text-slate-300 hover:text-primary-300 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                {pagesDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg" style={{ backgroundColor: bgColor }}>
                    <div className="py-1">
                      {staticPages.map((page) => (
                        <a
                          key={page.id}
                          href={`/page/${page.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavigation(`/page/${page.slug}`);
                            setPagesDropdownOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                        >
                          {page.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-4">
            {user && profile ? (
              <a
                href={isAdmin ? '/admin' : '/customer'}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation(isAdmin ? 'admin' : 'customer');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-bold text-sm tracking-wider hover:bg-primary-600 transition-all rounded"
              >
                <User className="w-4 h-4" />
                {isAdmin ? 'ADMIN' : 'MY ACCOUNT'}
              </a>
            ) : (
              <>
                <a
                  href="/book"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('book');
                  }}
                  className="px-8 py-3 bg-primary-500 text-white font-bold text-sm tracking-wider hover:bg-primary-600 transition-all shadow-lg rounded inline-block"
                >
                  BOOK NOW
                </a>
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigation('login');
                  }}
                  className="px-6 py-3 border border-white/20 text-white text-sm tracking-wider hover:bg-white/10 transition-all rounded inline-block"
                >
                  LOGIN
                </a>
              </>
            )}
          </div>

          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden backdrop-blur-md border-t border-white/10" style={{ backgroundColor: bgColor }}>
          <div className="px-4 pt-4 pb-6 space-y-2">
            {navLinks.filter((l) => l.enabled !== false).map((link) => (
              <button
                key={link.path}
                onClick={() => handleNavigation(link.path)}
                className={`block w-full text-left px-4 py-3 text-sm font-medium tracking-wider transition-colors`}
                style={{ color: currentPage === link.path ? activeColor : textColor }}
              >
                {link.name}
              </button>
            ))}
            {navLinks.filter((l) => l.enabled !== false && l.children && l.children.length > 0).map((link) => (
              <div key={`${link.path}-children`} className="pl-4">
                {link.children!.filter((c) => c.enabled !== false).map((child) => (
                  <button
                    key={`${link.path}-${child.path}-m`}
                    onClick={() => handleNavigation(child.path)}
                    className="block w-full text-left px-4 py-2 text-sm font-medium tracking-wider transition-colors"
                    style={{ color: currentPage === child.path ? activeColor : textColor }}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            ))}
            {staticPages.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  More Pages
                </div>
                {staticPages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handleNavigation(`/page/${page.slug}`)}
                    className="block w-full text-left px-4 py-3 text-sm font-medium tracking-wider text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {page.title}
                  </button>
                ))}
              </>
            )}
            <div className="pt-4 space-y-3">
              {user && profile ? (
                <button
                  onClick={() => handleNavigation(isAdmin ? 'admin' : 'customer')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white font-bold text-sm tracking-wider"
                >
                  <User className="w-4 h-4" />
                  {isAdmin ? 'ADMIN' : 'MY ACCOUNT'}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigation('book')}
                    className="w-full px-4 py-3 bg-primary-500 text-white font-bold text-sm tracking-wider"
                  >
                    BOOK NOW
                  </button>
                  <button
                    onClick={() => handleNavigation('login')}
                    className="w-full px-4 py-3 border border-white/20 text-white text-sm tracking-wider"
                  >
                    LOGIN
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
