import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const SnapchatIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M15.943 11.526c-.111-.303-.323-.465-.564-.599a1 1 0 0 0-.123-.064l-.219-.111c-.752-.399-1.339-.902-1.746-1.498a3.4 3.4 0 0 1-.3-.531c-.034-.1-.032-.156-.008-.207a.3.3 0 0 1 .097-.1c.129-.086.262-.173.352-.231.162-.104.289-.187.371-.245.309-.216.525-.446.66-.702a1.4 1.4 0 0 0 .069-1.16c-.205-.538-.713-.872-1.329-.872a1.8 1.8 0 0 0-.487.065c.006-.368-.002-.757-.035-1.139-.116-1.344-.587-2.048-1.077-2.61a4.3 4.3 0 0 0-1.095-.881C9.764.216 8.92 0 7.999 0s-1.76.216-2.505.641c-.412.232-.782.53-1.097.883-.49.562-.96 1.267-1.077 2.61-.033.382-.04.772-.036 1.138a1.8 1.8 0 0 0-.487-.065c-.615 0-1.124.335-1.328.873a1.4 1.4 0 0 0 .067 1.161c.136.256.352.486.66.701.082.058.21.14.371.246l.339.221a.4.4 0 0 1 .109.11c.026.053.027.11-.012.217a3.4 3.4 0 0 1-.295.52c-.398.583-.968 1.077-1.696 1.472-.385.204-.786.34-.955.8-.128.348-.044.743.28 1.075q.18.189.409.31a4.4 4.4 0 0 0 1 .4.7.7 0 0 1 .202.09c.118.104.102.26.259.488q.12.178.296.3c.33.229.701.243 1.095.258.355.014.758.03 1.217.18.19.064.389.186.618.328.55.338 1.305.802 2.566.802 1.262 0 2.02-.466 2.576-.806.227-.14.424-.26.609-.321.46-.152.863-.168 1.218-.181.393-.015.764-.03 1.095-.258a1.14 1.14 0 0 0 .336-.368c.114-.192.11-.327.217-.42a.6.6 0 0 1 .19-.087 4.5 4.5 0 0 0 1.014-.404c.16-.087.306-.2.429-.336l.004-.005c.304-.325.38-.709.256-1.047m-1.121.602c-.684.378-1.139.337-1.493.565-.3.193-.122.61-.34.76-.269.186-1.061-.012-2.085.326-.845.279-1.384 1.082-2.903 1.082s-2.045-.801-2.904-1.084c-1.022-.338-1.816-.14-2.084-.325-.218-.15-.041-.568-.341-.761-.354-.228-.809-.187-1.492-.563-.436-.24-.189-.39-.044-.46 2.478-1.199 2.873-3.05 2.89-3.188.022-.166.045-.297-.138-.466-.177-.164-.962-.65-1.18-.802-.36-.252-.52-.503-.402-.812.082-.214.281-.295.49-.295a1 1 0 0 1 .197.022c.396.086.78.285 1.002.338q.04.01.082.011c.118 0 .16-.06.152-.195-.026-.433-.087-1.277-.019-2.066.094-1.084.444-1.622.859-2.097.2-.229 1.137-1.22 2.93-1.22 1.792 0 2.732.987 2.931 1.215.416.475.766 1.013.859 2.098.068.788.009 1.632-.019 2.065-.01.142.034.195.152.195a.4.4 0 0 0 .082-.01c.222-.054.607-.253 1.002-.338a1 1 0 0 1 .197-.023c.21 0 .409.082.49.295.117.309-.04.56-.401.812-.218.152-1.003.638-1.18.802-.184.169-.16.3-.139.466.018.14.413 1.991 2.89 3.189.147.073.394.222-.041.464"/>
    </svg>
  );
  const TikTokIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M9 0h1.98c.144.715.54 1.617 1.235 2.512C12.895 3.389 13.797 4 15 4v2c-1.753 0-3.07-.814-4-1.829V11a5 5 0 1 1-5-5v2a3 3 0 1 0 3 3z"/>
    </svg>
  );
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [footerSettings, setFooterSettings] = useState<any>({
    footer_company_intro: '',
    footer_copyright_text: '',
    footer_opening_hours: [],
    footer_quick_links: [],
  });

  useEffect(() => {
    loadSiteSettings();
  }, []);

  const loadSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: any = {};
      const footerObj: any = {
        footer_company_intro: '',
        footer_copyright_text: '',
        footer_opening_hours: [],
        footer_quick_links: [],
      };

      (data as any[])?.forEach((item) => {
        const key = item.setting_key;
        const value = item.setting_value;

        if (key.startsWith('footer_')) {
          if (key === 'footer_opening_hours' || key === 'footer_quick_links') {
            footerObj[key] = Array.isArray(value) ? value : [];
          } else {
            footerObj[key] = typeof value === 'string' ? value : value || '';
          }
        } else {
          settingsObj[key] = typeof value === 'string' ? value : value?.value || '';
        }
      });

      setSiteSettings(settingsObj);
      setFooterSettings(footerObj);
    } catch (error) {
      console.error('Error loading site settings:', error);
    }
  };

  const companyName = siteSettings.company_name || 'DarkRoom';
  const companyDescription =
    siteSettings.company_description ||
    footerSettings.footer_company_intro ||
    'DarkRoom creates cinematic horror escape experiences with premium sets, story-led puzzles, and unforgettable finales.';
  const copyrightText =
    footerSettings.footer_copyright_text ||
    `${companyName}. All rights reserved.`;

  return (
    <footer className="bg-charcoal-950 text-slate-300 border-t border-red-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            {siteSettings.logo_url ? (
              <img
                src={siteSettings.logo_url}
                alt={siteSettings.company_name || 'Logo'}
                className="h-10 w-auto mb-4"
              />
            ) : (
              <h3 className="text-white text-lg font-bold mb-4 font-display tracking-wider">
                {companyName}
              </h3>
            )}
            <p className="text-sm mb-4">
              {companyDescription}
            </p>
            <div className="flex gap-4">
              {siteSettings.facebook_url && (
                <a href={siteSettings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {siteSettings.instagram_url && (
                <a href={siteSettings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {siteSettings.twitter_url && (
                <a href={siteSettings.twitter_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
              )}
              {siteSettings.linkedin_url && (
                <a href={siteSettings.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
              {siteSettings.snapchat_url && (
                <a href={siteSettings.snapchat_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <SnapchatIcon className="w-5 h-5" />
                </a>
              )}
              {siteSettings.tiktok_url && (
                <a href={siteSettings.tiktok_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary-400 transition-colors">
                  <TikTokIcon className="w-5 h-5" />
                </a>
              )}
              
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerSettings.footer_quick_links.length > 0 ? (
                footerSettings.footer_quick_links.map((link: any, index: number) => (
                  <li key={index}>
                    <a
                      href={link.page.startsWith('/') ? link.page : `/${link.page}`}
                      onClick={(e) => {
                        e.preventDefault();
                        const pagePath = link.page.startsWith('/') ? link.page : 
                          (['page/', 'game/', 'blog/'].some(p => link.page.startsWith(p)) ? `/${link.page}` : link.page);
                        onNavigate(pagePath);
                      }}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))
              ) : (
                <>
                  <li>
                    <a
                      href="/games"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('games');
                      }}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      Our Games
                    </a>
                  </li>
                  <li>
                    <a
                      href="/book"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('book');
                      }}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      Book Now
                    </a>
                  </li>
                  <li>
                    <a
                      href="/about"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('about');
                      }}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      About Us
                    </a>
                  </li>
                  <li>
                    <a
                      href="/contact"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('contact');
                      }}
                      className="text-sm hover:text-primary-400 transition-colors"
                    >
                      Contact
                    </a>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact Info</h4>
            <ul className="space-y-3">
              {siteSettings.address && (
                <li className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{siteSettings.address}</span>
                </li>
              )}
              {siteSettings.phone_number && (
                <li className="flex items-start gap-2">
                  <Phone className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{siteSettings.phone_number}</span>
                </li>
              )}
              {siteSettings.primary_email && (
                <li className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{siteSettings.primary_email}</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Opening Hours</h4>
            <ul className="space-y-2">
              {footerSettings.footer_opening_hours.length > 0 ? (
                footerSettings.footer_opening_hours.map((hour: any, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p>{hour.days}</p>
                      <p className="text-slate-400">{hour.hours}</p>
                    </div>
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p>Monday - Thursday</p>
                      <p className="text-slate-400">10:00 AM - 11:00 PM</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p>Friday - Sunday</p>
                      <p className="text-slate-400">10:00 AM - 12:00 AM</p>
                    </div>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-400 order-2 md:order-1">
            &copy; {new Date().getFullYear()} {copyrightText}
          </p>
          <div className="flex gap-6 text-sm text-slate-400 order-1 md:order-2">
            <a 
              href="/privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy-policy');
              }}
              className="hover:text-primary-500 transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/page/terms-and-conditions"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/page/terms-and-conditions');
              }}
              className="hover:text-primary-500 transition-colors"
            >
              Terms & Conditions
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
