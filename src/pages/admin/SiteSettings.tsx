import { useState, useEffect } from 'react';
import { Palette, Phone, Share2, Code, Save, Loader2, Image as ImageIcon, ChevronDown, ChevronUp, Layers, Plus, Trash2, Bell, Video, Mail, Lock, BookOpen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
// import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../../components/FileUpload';
import SnippetManager, { TrackingSnippet } from '../../components/SnippetManager';

interface OpeningHour {
  days: string;
  hours: string;
}

interface QuickLink {
  label: string;
  page: string;
  enabled?: boolean;
}

interface HeaderMenuItem extends QuickLink {
  children?: QuickLink[];
}

interface StatItem {
  value: string;
  label: string;
  sublabel?: string;
}

interface TestimonialFallbackItem {
  quote: string;
  name: string;
  role: string;
}

interface AboutValueItem {
  title: string;
  description: string;
  icon: string;
}

interface ContactFaqItem {
  question: string;
  answer: string;
}

interface BlogFallbackPostItem {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  image_url: string;
  author_name: string;
}

interface PopupBannerSettings {
  id: string | null;
  is_enabled: boolean;
  title: string;
  description: string;
  image_url: string;
  mobile_image_url: string;
  banner_width: number;
  banner_height: number;
  button_text: string;
  button_url: string;
  show_on_load: boolean;
  delay_seconds: number;
  show_once_per_session: boolean;
  background_color: string;
  text_color: string;
  button_color: string;
}

interface Settings {
  company_name: string;
  company_description: string;
  logo_url: string;
  favicon_url: string;
  phone_number: string;
  whatsapp_number: string;
  whatsapp_enabled: boolean;
  primary_email: string;
  contact_email: string;
  address: string;
  google_maps_embed_url: string;
  facebook_url: string;
  instagram_url: string;
  snapchat_url: string;
  linkedin_url: string;
  twitter_url: string;
  tiktok_url: string;
  header_menu_bg_color: string;
  header_menu_bg_opacity: number;
  header_menu_text_color: string;
  header_menu_hover_color: string;
  header_menu_active_color: string;
  header_menu_preset: string;
  header_menu_links: HeaderMenuItem[];
  custom_head_code: string;
  tracking_head_snippets: TrackingSnippet[];
  tracking_body_snippets: TrackingSnippet[];
  hero_height_value: number;
  hero_height_unit: string;
  hero_background_image: string;
  hero_title: string;
  hero_subtitle: string;
  hero_primary_button_text: string;
  hero_primary_button_action: string;
  hero_secondary_button_text: string;
  hero_secondary_button_action: string;
  home_stats_heading: string;
  home_stats_description: string;
  home_stats_bullets: string[];
  home_stats_button_text: string;
  home_stats_button_action: string;
  home_stats_items: StatItem[];
  home_testimonials_heading: string;
  home_testimonials_subtitle: string;
  home_testimonials_fallback: TestimonialFallbackItem[];
  footer_company_intro: string;
  footer_copyright_text: string;
  footer_opening_hours: OpeningHour[];
  footer_quick_links: QuickLink[];
  // Video Order Settings
  video_order_hero_title: string;
  video_order_hero_subtitle: string;
  video_order_hero_background: string;
  video_order_pricing_1hour: number;
  video_order_pricing_2hour: number;
  video_order_pricing_3hour: number;
  video_order_duration_1_minutes: number;
  video_order_duration_2_minutes: number;
  video_order_duration_3_minutes: number;
  video_order_duration_1hour: number;
  video_order_duration_2hour: number;
  video_order_duration_3hour: number;
  video_order_delivery_email: boolean;
  video_order_delivery_link: boolean;
  video_order_contact_phone: string;
  video_order_contact_whatsapp: string;
  video_order_terms_text: string;
  // Contact Settings
  contact_hero_title: string;
  contact_hero_subtitle: string;
  contact_hero_background: string;
  contact_map_embed_url: string;
  contact_show_map: boolean;
  contact_show_form: boolean;
  contact_additional_info: string;
  about_enabled: boolean;
  about_title: string;
  about_subtitle: string;
  about_story_title: string;
  about_story_content: string;
  about_mission_title: string;
  about_mission_content: string;
  about_vision_title: string;
  about_vision_content: string;
  about_values: AboutValueItem[];
  about_media_type: 'image' | 'video';
  about_media_url: string;
  about_media_poster_url: string;
  about_media_alt: string;
  contact_faqs: ContactFaqItem[];
  blog_hero_title: string;
  blog_hero_subtitle: string;
  blog_fallback_posts: BlogFallbackPostItem[];
  // OAuth Settings
  oauth_google_enabled: boolean;
  oauth_facebook_enabled: boolean;
  oauth_apple_enabled: boolean;
  oauth_max_providers: number;
}

const defaultMenuItems = (): HeaderMenuItem[] => ([
  { label: 'HOME', page: 'home', enabled: true },
  { label: 'Games', page: 'games', enabled: true },
  { label: 'Lobby Games', page: 'lobby-games', enabled: true },
  { label: 'Merchandise', page: 'merchandise', enabled: true },
  { label: 'Blog', page: 'blog', enabled: true },
  { label: 'Video Order', page: 'order-video', enabled: true },
  { label: 'Contact', page: 'contact', enabled: true },
  { label: 'About', page: 'about', enabled: true },
]);

export default function SiteSettings() {
  // const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: true,
    popup: false,
    branding: false,
    contact: false,
    menu: false,
    social: false,
    tracking: false,
    footer: false,
    videoOrder: false,
    contactPage: false,
    aboutPage: true,
    blogPage: false,
    oauth: false,
  });

  const [popupSettings, setPopupSettings] = useState<PopupBannerSettings>({
    id: null,
    is_enabled: false,
    title: '',
    description: '',
    image_url: '',
    mobile_image_url: '',
    banner_width: 600,
    banner_height: 400,
    button_text: '',
    button_url: '',
    show_on_load: true,
    delay_seconds: 0,
    show_once_per_session: true,
    background_color: '#ffffff',
    text_color: '#000000',
    button_color: '#3b82f6',
  });

  const [settings, setSettings] = useState<Settings>({
    company_name: '',
    company_description: '',
    logo_url: '',
    favicon_url: '',
    phone_number: '',
    whatsapp_number: '',
    whatsapp_enabled: false,
    primary_email: '',
    contact_email: '',
    address: '',
    google_maps_embed_url: '',
    facebook_url: '',
    instagram_url: '',
    snapchat_url: '',
    linkedin_url: '',
    twitter_url: '',
    tiktok_url: '',
    header_menu_bg_color: '#0f172a',
    header_menu_bg_opacity: 0.8,
    header_menu_text_color: '#cbd5e1',
    header_menu_hover_color: '#ffffff',
    header_menu_active_color: '#ffffff',
    header_menu_preset: 'dark',
    header_menu_links: [],
    custom_head_code: '',
    tracking_head_snippets: [],
    tracking_body_snippets: [],
    hero_height_value: 50,
    hero_height_unit: 'vh',
    hero_background_image: '',
    hero_title: '',
    hero_subtitle: '',
    hero_primary_button_text: '',
    hero_primary_button_action: '',
    hero_secondary_button_text: '',
    hero_secondary_button_action: '',
    home_stats_heading: '',
    home_stats_description: '',
    home_stats_bullets: [],
    home_stats_button_text: '',
    home_stats_button_action: '',
    home_stats_items: [],
    home_testimonials_heading: '',
    home_testimonials_subtitle: '',
    home_testimonials_fallback: [],
    footer_company_intro: '',
    footer_copyright_text: '',
    footer_opening_hours: [],
    footer_quick_links: [],
    // Video Order Settings
    video_order_hero_title: '',
    video_order_hero_subtitle: '',
    video_order_hero_background: '',
    video_order_pricing_1hour: 150,
    video_order_pricing_2hour: 250,
    video_order_pricing_3hour: 350,
    video_order_duration_1_minutes: 60,
    video_order_duration_2_minutes: 120,
    video_order_duration_3_minutes: 180,
    video_order_duration_1hour: 0,
    video_order_duration_2hour: 0,
    video_order_duration_3hour: 0,
    video_order_delivery_email: true,
    video_order_delivery_link: true,
    video_order_contact_phone: '',
    video_order_contact_whatsapp: '',
    video_order_terms_text: '',
    // Contact Settings
    contact_hero_title: '',
    contact_hero_subtitle: '',
    contact_hero_background: '',
    contact_map_embed_url: '',
    contact_show_map: true,
    contact_show_form: true,
    contact_additional_info: '',
    about_enabled: true,
    about_title: '',
    about_subtitle: '',
    about_story_title: '',
    about_story_content: '',
    about_mission_title: '',
    about_mission_content: '',
    about_vision_title: '',
    about_vision_content: '',
    about_values: [],
    about_media_type: 'image',
    about_media_url: '',
    about_media_poster_url: '',
    about_media_alt: '',
    contact_faqs: [],
    blog_hero_title: '',
    blog_hero_subtitle: '',
    blog_fallback_posts: [],
    // OAuth Settings
    oauth_google_enabled: true,
    oauth_facebook_enabled: true,
    oauth_apple_enabled: false,
    oauth_max_providers: 2,
  });

  useEffect(() => {
    loadSettings();
    loadPopupSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value');

      if (error) throw error;

      const settingsObj: any = {};
      (data as any[] || [])?.forEach((item) => {
        const key = item.setting_key;
        const value = item.setting_value;

        if (
          key === 'footer_opening_hours' ||
          key === 'footer_quick_links' ||
          key === 'header_menu_links' ||
          key === 'tracking_head_snippets' ||
          key === 'tracking_body_snippets' ||
          key === 'home_stats_bullets' ||
          key === 'home_stats_items' ||
          key === 'home_testimonials_fallback' ||
          key === 'about_values' ||
          key === 'contact_faqs' ||
          key === 'blog_fallback_posts'
        ) {
          settingsObj[key] = Array.isArray(value) ? value : [];
        } else {
          if (value && typeof value === 'object' && 'value' in (value as any)) {
            settingsObj[key] = (value as any).value;
          } else {
            settingsObj[key] = value;
          }
        }
      });

      // Ensure new pages appear in Menu Items if not present
      const existingLinks: HeaderMenuItem[] = Array.isArray(settingsObj.header_menu_links) ? settingsObj.header_menu_links : [];
      const requiredPages: HeaderMenuItem[] = [
        { label: 'Video Order', page: 'order-video', enabled: true },
        { label: 'Contact', page: 'contact', enabled: true },
      ];
      requiredPages.forEach((req) => {
        if (!existingLinks.some((l) => (l.page || '').toLowerCase() === req.page)) {
          existingLinks.push(req);
        }
      });

      // Prepare Tracking Snippets
      const trackingHeadSnippets = Array.isArray(settingsObj.tracking_head_snippets) ? settingsObj.tracking_head_snippets : [];
      if (settingsObj.custom_head_code && trackingHeadSnippets.length === 0) {
        trackingHeadSnippets.push({
          id: crypto.randomUUID(),
          name: 'Legacy Head Code',
          code: settingsObj.custom_head_code,
          enabled: true,
          order_index: 0,
          placement: 'head',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      
      const trackingBodySnippets = Array.isArray(settingsObj.tracking_body_snippets) ? settingsObj.tracking_body_snippets : [];

      setSettings({
        company_name: settingsObj.company_name || '',
        company_description: settingsObj.company_description || '',
        logo_url: settingsObj.logo_url || '',
        favicon_url: settingsObj.favicon_url || '',
        phone_number: settingsObj.phone_number || '',
        whatsapp_number: settingsObj.whatsapp_number || '',
        whatsapp_enabled: settingsObj.whatsapp_enabled === true || settingsObj.whatsapp_enabled === 'true' || settingsObj.whatsapp_enabled === 1,
        primary_email: settingsObj.primary_email || '',
        contact_email: settingsObj.contact_email || '',
        address: settingsObj.address || '',
        google_maps_embed_url: settingsObj.google_maps_embed_url || '',
        facebook_url: settingsObj.facebook_url || '',
        instagram_url: settingsObj.instagram_url || '',
        snapchat_url: settingsObj.snapchat_url || '',
        linkedin_url: settingsObj.linkedin_url || '',
        twitter_url: settingsObj.twitter_url || '',
        tiktok_url: settingsObj.tiktok_url || '',
        header_menu_bg_color: settingsObj.header_menu_bg_color || '#0f172a',
        header_menu_bg_opacity: parseFloat(settingsObj.header_menu_bg_opacity) || 0.8,
        header_menu_text_color: settingsObj.header_menu_text_color || '#cbd5e1',
        header_menu_hover_color: settingsObj.header_menu_hover_color || '#ffffff',
        header_menu_active_color: settingsObj.header_menu_active_color || '#ffffff',
        header_menu_preset: settingsObj.header_menu_preset || 'dark',
        header_menu_links: (existingLinks && existingLinks.length)
          ? existingLinks
          : defaultMenuItems(),
        custom_head_code: settingsObj.custom_head_code || '',
        tracking_head_snippets: trackingHeadSnippets,
        tracking_body_snippets: trackingBodySnippets,
        hero_height_value: parseFloat(settingsObj.hero_height_value) || 50,
        hero_height_unit: settingsObj.hero_height_unit || 'vh',
        hero_background_image: settingsObj.hero_background_image || '',
        hero_title: settingsObj.hero_title || '',
        hero_subtitle: settingsObj.hero_subtitle || '',
        hero_primary_button_text: settingsObj.hero_primary_button_text || '',
        hero_primary_button_action: settingsObj.hero_primary_button_action || '',
        hero_secondary_button_text: settingsObj.hero_secondary_button_text || '',
        hero_secondary_button_action: settingsObj.hero_secondary_button_action || '',
        home_stats_heading: settingsObj.home_stats_heading || '',
        home_stats_description: settingsObj.home_stats_description || '',
        home_stats_bullets: settingsObj.home_stats_bullets || [],
        home_stats_button_text: settingsObj.home_stats_button_text || '',
        home_stats_button_action: settingsObj.home_stats_button_action || '',
        home_stats_items: settingsObj.home_stats_items || [],
        home_testimonials_heading: settingsObj.home_testimonials_heading || '',
        home_testimonials_subtitle: settingsObj.home_testimonials_subtitle || '',
        home_testimonials_fallback: settingsObj.home_testimonials_fallback || [],
        footer_company_intro: settingsObj.footer_company_intro || '',
        footer_copyright_text: settingsObj.footer_copyright_text || '',
        footer_opening_hours: settingsObj.footer_opening_hours || [],
        footer_quick_links: settingsObj.footer_quick_links || [],
        // Video Order Settings
        video_order_hero_title: settingsObj.video_order_hero_title || '',
        video_order_hero_subtitle: settingsObj.video_order_hero_subtitle || '',
        video_order_hero_background: settingsObj.video_order_hero_background || '',
        video_order_pricing_1hour: parseFloat(settingsObj.video_order_pricing_1hour) || 150,
        video_order_pricing_2hour: parseFloat(settingsObj.video_order_pricing_2hour) || 250,
        video_order_pricing_3hour: parseFloat(settingsObj.video_order_pricing_3hour) || 350,
        video_order_duration_1_minutes: parseFloat(settingsObj.video_order_duration_1_minutes) || (
          settingsObj.video_order_duration_1hour ? parseFloat(settingsObj.video_order_duration_1hour) * 60 : 60
        ),
        video_order_duration_2_minutes: parseFloat(settingsObj.video_order_duration_2_minutes) || (
          settingsObj.video_order_duration_2hour ? parseFloat(settingsObj.video_order_duration_2hour) * 60 : 120
        ),
        video_order_duration_3_minutes: parseFloat(settingsObj.video_order_duration_3_minutes) || (
          settingsObj.video_order_duration_3hour ? parseFloat(settingsObj.video_order_duration_3hour) * 60 : 180
        ),
        video_order_duration_1hour: 0,
        video_order_duration_2hour: 0,
        video_order_duration_3hour: 0,
        video_order_delivery_email: settingsObj.video_order_delivery_email === true || settingsObj.video_order_delivery_email === 'true' || settingsObj.video_order_delivery_email === 1,
        video_order_delivery_link: settingsObj.video_order_delivery_link === true || settingsObj.video_order_delivery_link === 'true' || settingsObj.video_order_delivery_link === 1,
        video_order_contact_phone: settingsObj.video_order_contact_phone || '',
        video_order_contact_whatsapp: settingsObj.video_order_contact_whatsapp || '',
        video_order_terms_text: settingsObj.video_order_terms_text || '',
        // Contact Settings
        contact_hero_title: settingsObj.contact_hero_title || '',
        contact_hero_subtitle: settingsObj.contact_hero_subtitle || '',
        contact_hero_background: settingsObj.contact_hero_background || '',
        contact_map_embed_url: settingsObj.contact_map_embed_url || '',
        contact_show_map: settingsObj.contact_show_map == null ? true : settingsObj.contact_show_map === true || settingsObj.contact_show_map === 'true' || settingsObj.contact_show_map === 1,
        contact_show_form: settingsObj.contact_show_form == null ? true : settingsObj.contact_show_form === true || settingsObj.contact_show_form === 'true' || settingsObj.contact_show_form === 1,
        contact_additional_info: settingsObj.contact_additional_info || '',
        about_enabled: settingsObj.about_enabled == null ? true : settingsObj.about_enabled === true || settingsObj.about_enabled === 'true' || settingsObj.about_enabled === 1,
        about_title: settingsObj.about_title || '',
        about_subtitle: settingsObj.about_subtitle || '',
        about_story_title: settingsObj.about_story_title || '',
        about_story_content: settingsObj.about_story_content || '',
        about_mission_title: settingsObj.about_mission_title || '',
        about_mission_content: settingsObj.about_mission_content || '',
        about_vision_title: settingsObj.about_vision_title || '',
        about_vision_content: settingsObj.about_vision_content || '',
        about_values: settingsObj.about_values || [],
        about_media_type: (settingsObj.about_media_type === 'video' ? 'video' : 'image'),
        about_media_url: settingsObj.about_media_url || '',
        about_media_poster_url: settingsObj.about_media_poster_url || '',
        about_media_alt: settingsObj.about_media_alt || '',
        contact_faqs: settingsObj.contact_faqs || [],
        blog_hero_title: settingsObj.blog_hero_title || '',
        blog_hero_subtitle: settingsObj.blog_hero_subtitle || '',
        blog_fallback_posts: settingsObj.blog_fallback_posts || [],
        // OAuth Settings
        oauth_google_enabled: settingsObj.oauth_google_enabled === true || settingsObj.oauth_google_enabled === 'true',
        oauth_facebook_enabled: settingsObj.oauth_facebook_enabled === true || settingsObj.oauth_facebook_enabled === 'true',
        oauth_apple_enabled: settingsObj.oauth_apple_enabled === true || settingsObj.oauth_apple_enabled === 'true',
        oauth_max_providers: parseInt(settingsObj.oauth_max_providers) || 2,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadPopupSettings = async () => {
    try {
      const { data, error } = await (supabase
        .from('popup_banner_settings') as any)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPopupSettings({
          id: data.id,
          is_enabled: data.is_enabled,
          title: data.title || '',
          description: data.description || '',
          image_url: data.image_url || '',
          mobile_image_url: data.mobile_image_url || '',
          banner_width: data.banner_width || 600,
          banner_height: data.banner_height || 400,
          button_text: data.button_text || '',
          button_url: data.button_url || '',
          show_on_load: data.show_on_load,
          delay_seconds: data.delay_seconds || 0,
          show_once_per_session: data.show_once_per_session,
          background_color: data.background_color || '#ffffff',
          text_color: data.text_color || '#000000',
          button_color: data.button_color || '#3b82f6',
        });
      }
    } catch (error) {
      console.error('Error loading popup settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
      }));

      for (const setting of settingsToSave) {
        const { error } = await (supabase
          .from('site_settings') as any)
          .upsert(
            {
              setting_key: setting.setting_key,
              setting_value: setting.setting_value,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'setting_key',
            }
          );

        if (error) throw error;
      }

      if (popupSettings.id) {
        const { error: popupError } = await (supabase
          .from('popup_banner_settings') as any)
          .update({
            is_enabled: popupSettings.is_enabled,
            title: popupSettings.title,
            description: popupSettings.description,
            image_url: popupSettings.image_url,
            mobile_image_url: popupSettings.mobile_image_url,
            banner_width: popupSettings.banner_width,
            banner_height: popupSettings.banner_height,
            button_text: popupSettings.button_text,
            button_url: popupSettings.button_url,
            show_on_load: popupSettings.show_on_load,
            delay_seconds: popupSettings.delay_seconds,
            show_once_per_session: popupSettings.show_once_per_session,
            background_color: popupSettings.background_color,
            text_color: popupSettings.text_color,
            button_color: popupSettings.button_color,
          })
          .eq('id', popupSettings.id);

        if (popupError) throw popupError;
      } else {
        const { data: newPopup, error: popupError } = await (supabase
          .from('popup_banner_settings') as any)
          .insert({
            is_enabled: popupSettings.is_enabled,
            title: popupSettings.title,
            description: popupSettings.description,
            image_url: popupSettings.image_url,
            mobile_image_url: popupSettings.mobile_image_url,
            banner_width: popupSettings.banner_width,
            banner_height: popupSettings.banner_height,
            button_text: popupSettings.button_text,
            button_url: popupSettings.button_url,
            show_on_load: popupSettings.show_on_load,
            delay_seconds: popupSettings.delay_seconds,
            show_once_per_session: popupSettings.show_once_per_session,
            background_color: popupSettings.background_color,
            text_color: popupSettings.text_color,
            button_color: popupSettings.button_color,
          })
          .select()
          .single();

        if (popupError) throw popupError;
        if (newPopup) {
          setPopupSettings((prev) => ({ ...prev, id: newPopup.id }));
        }
      }

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Settings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handlePopupChange = (field: keyof PopupBannerSettings, value: string | boolean | number) => {
    setPopupSettings((prev) => ({ ...prev, [field]: value }));
  };

  const addOpeningHour = () => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: [...prev.footer_opening_hours, { days: '', hours: '' }]
    }));
  };

  const updateOpeningHour = (index: number, field: 'days' | 'hours', value: string) => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: prev.footer_opening_hours.map((hour, i) =>
        i === index ? { ...hour, [field]: value } : hour
      )
    }));
  };

  const removeOpeningHour = (index: number) => {
    setSettings(prev => ({
      ...prev,
      footer_opening_hours: prev.footer_opening_hours.filter((_, i) => i !== index)
    }));
  };

  const addQuickLink = () => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: [...prev.footer_quick_links, { label: '', page: '' }]
    }));
  };

  const updateQuickLink = (index: number, field: 'label' | 'page', value: string) => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: prev.footer_quick_links.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeQuickLink = (index: number) => {
    setSettings(prev => ({
      ...prev,
      footer_quick_links: prev.footer_quick_links.filter((_, i) => i !== index)
    }));
  };

  const addHomeStat = () => {
    setSettings(prev => ({
      ...prev,
      home_stats_items: [...prev.home_stats_items, { value: '', label: '', sublabel: '' }]
    }));
  };

  const updateHomeStat = (index: number, field: keyof StatItem, value: string) => {
    setSettings(prev => ({
      ...prev,
      home_stats_items: prev.home_stats_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeHomeStat = (index: number) => {
    setSettings(prev => ({
      ...prev,
      home_stats_items: prev.home_stats_items.filter((_, i) => i !== index)
    }));
  };

  const addHomeBullet = () => {
    setSettings(prev => ({
      ...prev,
      home_stats_bullets: [...prev.home_stats_bullets, '']
    }));
  };

  const updateHomeBullet = (index: number, value: string) => {
    setSettings(prev => ({
      ...prev,
      home_stats_bullets: prev.home_stats_bullets.map((item, i) => i === index ? value : item)
    }));
  };

  const removeHomeBullet = (index: number) => {
    setSettings(prev => ({
      ...prev,
      home_stats_bullets: prev.home_stats_bullets.filter((_, i) => i !== index)
    }));
  };

  const addFallbackTestimonial = () => {
    setSettings(prev => ({
      ...prev,
      home_testimonials_fallback: [
        ...prev.home_testimonials_fallback,
        { quote: '', name: '', role: '' }
      ]
    }));
  };

  const updateFallbackTestimonial = (index: number, field: keyof TestimonialFallbackItem, value: string) => {
    setSettings(prev => ({
      ...prev,
      home_testimonials_fallback: prev.home_testimonials_fallback.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeFallbackTestimonial = (index: number) => {
    setSettings(prev => ({
      ...prev,
      home_testimonials_fallback: prev.home_testimonials_fallback.filter((_, i) => i !== index)
    }));
  };

  const addAboutValue = () => {
    setSettings(prev => ({
      ...prev,
      about_values: [...prev.about_values, { title: '', description: '', icon: 'Target' }]
    }));
  };

  const updateAboutValue = (index: number, field: keyof AboutValueItem, value: string) => {
    setSettings(prev => ({
      ...prev,
      about_values: prev.about_values.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeAboutValue = (index: number) => {
    setSettings(prev => ({
      ...prev,
      about_values: prev.about_values.filter((_, i) => i !== index)
    }));
  };

  const addContactFaq = () => {
    setSettings(prev => ({
      ...prev,
      contact_faqs: [...prev.contact_faqs, { question: '', answer: '' }]
    }));
  };

  const updateContactFaq = (index: number, field: keyof ContactFaqItem, value: string) => {
    setSettings(prev => ({
      ...prev,
      contact_faqs: prev.contact_faqs.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeContactFaq = (index: number) => {
    setSettings(prev => ({
      ...prev,
      contact_faqs: prev.contact_faqs.filter((_, i) => i !== index)
    }));
  };

  const addBlogFallbackPost = () => {
    setSettings(prev => ({
      ...prev,
      blog_fallback_posts: [
        ...prev.blog_fallback_posts,
        { title: '', slug: '', excerpt: '', content: '', image_url: '', author_name: '' }
      ]
    }));
  };

  const updateBlogFallbackPost = (index: number, field: keyof BlogFallbackPostItem, value: string) => {
    setSettings(prev => ({
      ...prev,
      blog_fallback_posts: prev.blog_fallback_posts.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeBlogFallbackPost = (index: number) => {
    setSettings(prev => ({
      ...prev,
      blog_fallback_posts: prev.blog_fallback_posts.filter((_, i) => i !== index)
    }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold text-white">Site Settings</h1>
        </div>
        <p className="text-slate-300">Manage your website branding, contact info, and integrations</p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Hero Section Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('hero')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Hero Section</h2>
            </div>
            {expandedSections.hero ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.hero && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Hero Height Value
                  </label>
                  <input
                    type="number"
                    value={settings.hero_height_value}
                    onChange={(e) => handleChange('hero_height_value', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="50"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Height Unit
                  </label>
                  <select
                    value={settings.hero_height_unit}
                    onChange={(e) => handleChange('hero_height_unit', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                  >
                    <option value="vh">vh (viewport height)</option>
                    <option value="px">px (pixels)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Background Image
                </label>
                <FileUpload
                  currentImageUrl={settings.hero_background_image}
                  onUploadComplete={(url) => handleChange('hero_background_image', url)}
                  folder="hero"
                  accept="image/*"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Recommended: 1920x1080px or larger
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Title
                </label>
                <input
                  type="text"
                  value={settings.hero_title}
                  onChange={(e) => handleChange('hero_title', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="OUR ROOMS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Subtitle
                </label>
                <input
                  type="text"
                  value={settings.hero_subtitle}
                  onChange={(e) => handleChange('hero_subtitle', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Welcome to Your Next Adventure"
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Primary Button</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={settings.hero_primary_button_text}
                      onChange={(e) => handleChange('hero_primary_button_text', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                      placeholder="Book Your Adventure"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Button Action
                    </label>
                    <select
                      value={settings.hero_primary_button_action}
                      onChange={(e) => handleChange('hero_primary_button_action', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                    >
                      <option value="">Select Action</option>
                      <option value="book">Book (Booking Page)</option>
                      <option value="games">Games (Games Page)</option>
                      <option value="lobby-games">Lobby Games</option>
                      <option value="merchandise">Merchandise</option>
                      <option value="contact">Contact</option>
                      <option value="about">About</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Secondary Button</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={settings.hero_secondary_button_text}
                      onChange={(e) => handleChange('hero_secondary_button_text', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                      placeholder="Explore Games"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Button Action
                    </label>
                    <select
                      value={settings.hero_secondary_button_action}
                      onChange={(e) => handleChange('hero_secondary_button_action', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                    >
                      <option value="">Select Action</option>
                      <option value="book">Book (Booking Page)</option>
                      <option value="games">Games (Games Page)</option>
                      <option value="lobby-games">Lobby Games</option>
                      <option value="merchandise">Merchandise</option>
                      <option value="contact">Contact</option>
                      <option value="about">About</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Homepage Stats Section</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Section Heading</label>
                    <input
                      type="text"
                      value={settings.home_stats_heading}
                      onChange={(e) => handleChange('home_stats_heading', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Ready for the Challenge?"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Section Description</label>
                    <textarea
                      value={settings.home_stats_description}
                      onChange={(e) => handleChange('home_stats_description', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Book your escape room adventure today and create memories that will last a lifetime."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">CTA Button Text</label>
                      <input
                        type="text"
                        value={settings.home_stats_button_text}
                        onChange={(e) => handleChange('home_stats_button_text', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Book Your Slot Now"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">CTA Button Action</label>
                      <input
                        type="text"
                        value={settings.home_stats_button_action}
                        onChange={(e) => handleChange('home_stats_button_action', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="book"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">Feature Bullets</label>
                      <button onClick={addHomeBullet} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Bullet
                      </button>
                    </div>
                    <div className="space-y-3">
                      {settings.home_stats_bullets.map((bullet, index) => (
                        <div key={index} className="flex gap-3 items-start">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateHomeBullet(index, e.target.value)}
                            className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Group discounts available for 3+ players"
                          />
                          <button onClick={() => removeHomeBullet(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-slate-700">Stat Cards</label>
                      <button onClick={addHomeStat} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Stat
                      </button>
                    </div>
                    <div className="space-y-3">
                      {settings.home_stats_items.map((item, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) => updateHomeStat(index, 'value', e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="5000+"
                          />
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateHomeStat(index, 'label', e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Happy Players"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.sublabel || ''}
                              onChange={(e) => updateHomeStat(index, 'sublabel', e.target.value)}
                              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Optional sublabel"
                            />
                            <button onClick={() => removeHomeStat(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Homepage Testimonials Fallback</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Section Heading</label>
                      <input
                        type="text"
                        value={settings.home_testimonials_heading}
                        onChange={(e) => handleChange('home_testimonials_heading', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="What Our Players Say"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Section Subtitle</label>
                      <input
                        type="text"
                        value={settings.home_testimonials_subtitle}
                        onChange={(e) => handleChange('home_testimonials_subtitle', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Don't just take our word for it"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-slate-700">Fallback Testimonials</label>
                    <button onClick={addFallbackTestimonial} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                      <Plus className="w-4 h-4" />
                      Add Testimonial
                    </button>
                  </div>
                  <div className="space-y-4">
                    {settings.home_testimonials_fallback.map((item, index) => (
                      <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                        <textarea
                          value={item.quote}
                          onChange={(e) => updateFallbackTestimonial(index, 'quote', e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="An unforgettable night of tension, teamwork, and cinematic set design."
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateFallbackTestimonial(index, 'name', e.target.value)}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="Nadia R."
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.role}
                              onChange={(e) => updateFallbackTestimonial(index, 'role', e.target.value)}
                              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              placeholder="Birthday Group"
                            />
                            <button onClick={() => removeFallbackTestimonial(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popup Banner Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('popup')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Popup Banner</h2>
            </div>
            {expandedSections.popup ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.popup && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4 flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Enable Popup Banner
                  </label>
                  <p className="text-xs text-slate-500">
                    Show a promotional popup on the landing page
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={popupSettings.is_enabled}
                    onChange={(e) => handlePopupChange('is_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Popup Title
                </label>
                <input
                  type="text"
                  value={popupSettings.title}
                  onChange={(e) => handlePopupChange('title', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Welcome to Our Escape Room!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={popupSettings.description}
                  onChange={(e) => handlePopupChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Book your adventure today and experience the thrill!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Desktop Popup Image
                </label>
                <FileUpload
                  currentImageUrl={popupSettings.image_url}
                  onUploadComplete={(url) => handlePopupChange('image_url', url)}
                  folder="popup"
                  accept="image/*"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Image for desktop and tablet devices
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mobile Popup Image
                </label>
                <FileUpload
                  currentImageUrl={popupSettings.mobile_image_url}
                  onUploadComplete={(url) => handlePopupChange('mobile_image_url', url)}
                  folder="popup"
                  accept="image/*"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional: Separate image for mobile devices (screens &lt; 768px)
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Banner Size</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={popupSettings.banner_width}
                      onChange={(e) => handlePopupChange('banner_width', parseInt(e.target.value) || 600)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="300"
                      max="1200"
                      placeholder="600"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Recommended: 600-800px
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={popupSettings.banner_height}
                      onChange={(e) => handlePopupChange('banner_height', parseInt(e.target.value) || 400)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="200"
                      max="800"
                      placeholder="400"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Recommended: 400-600px
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={popupSettings.button_text}
                    onChange={(e) => handlePopupChange('button_text', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="Book Now"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Button URL
                  </label>
                  <input
                    type="text"
                    value={popupSettings.button_url}
                    onChange={(e) => handlePopupChange('button_url', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="/games or https://example.com"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Display Settings</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Show on page load
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupSettings.show_on_load}
                        onChange={(e) => handlePopupChange('show_on_load', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Delay before showing (seconds)
                    </label>
                    <input
                      type="number"
                      value={popupSettings.delay_seconds}
                      onChange={(e) => handlePopupChange('delay_seconds', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="0"
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Show once per session
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={popupSettings.show_once_per_session}
                        onChange={(e) => handlePopupChange('show_once_per_session', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Color Settings</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      value={popupSettings.background_color}
                      onChange={(e) => handlePopupChange('background_color', e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={popupSettings.text_color}
                      onChange={(e) => handlePopupChange('text_color', e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Button Color
                    </label>
                    <input
                      type="color"
                      value={popupSettings.button_color}
                      onChange={(e) => handlePopupChange('button_color', e.target.value)}
                      className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Branding Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('branding')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Branding</h2>
            </div>
            {expandedSections.branding ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.branding && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="MCS Consultancy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Description
                </label>
                <textarea
                  value={settings.company_description}
                  onChange={(e) => handleChange('company_description', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  rows={3}
                  placeholder="DarkRoom creates cinematic horror escape experiences built for story, tension, and unforgettable team moments."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Logo
                </label>
                <FileUpload
                  currentImageUrl={settings.logo_url}
                  onUploadComplete={(url) => handleChange('logo_url', url)}
                  folder="branding"
                  accept="image/*"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Favicon
                </label>
                <FileUpload
                  currentImageUrl={settings.favicon_url}
                  onUploadComplete={(url) => handleChange('favicon_url', url)}
                  folder="branding"
                  accept="image/x-icon,image/png"
                />
              </div>
            </div>
          )}
        </div>

        {/* Contact Information Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('contact')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Contact Information</h2>
            </div>
            {expandedSections.contact ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.contact && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.phone_number}
                  onChange={(e) => handleChange('phone_number', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="+971-50-83-22799"
                />
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Enable WhatsApp Button
                    </label>
                    <p className="text-xs text-slate-500">
                      Show WhatsApp chat button on your website
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.whatsapp_enabled}
                      onChange={(e) => handleChange('whatsapp_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {settings.whatsapp_enabled && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={settings.whatsapp_number}
                      onChange={(e) => handleChange('whatsapp_number', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                      placeholder="971XXXXXXXXX"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter in international format without + or spaces (e.g., 971501234567)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={settings.primary_email}
                  onChange={(e) => handleChange('primary_email', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="info@mcs1services.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Secondary Email (optional)
                </label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="contact@mcs1services.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Address
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Industrial Area 2, Sharjah, UAE"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Google Maps Embed URL
                </label>
                <input
                  type="text"
                  value={settings.google_maps_embed_url}
                  onChange={(e) => handleChange('google_maps_embed_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Get embed URL from Google Maps → Share → Embed a map
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Social Media Links Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('social')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Social Media Links</h2>
            </div>
            {expandedSections.social ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.social && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facebook
                </label>
                <input
                  type="text"
                  value={settings.facebook_url}
                  onChange={(e) => handleChange('facebook_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://facebook.com/yourpage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Twitter
                </label>
                <input
                  type="text"
                  value={settings.twitter_url}
                  onChange={(e) => handleChange('twitter_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn
                </label>
                <input
                  type="text"
                  value={settings.linkedin_url}
                  onChange={(e) => handleChange('linkedin_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Instagram
                </label>
                <input
                  type="text"
                  value={settings.instagram_url}
                  onChange={(e) => handleChange('instagram_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://instagram.com/yourhandle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Snapchat
                </label>
                <input
                  type="text"
                  value={settings.snapchat_url}
                  onChange={(e) => handleChange('snapchat_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://snapchat.com/add/yourhandle"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  TikTok
                </label>
                <input
                  type="text"
                  value={settings.tiktok_url}
                  onChange={(e) => handleChange('tiktok_url', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="https://www.tiktok.com/@yourhandle"
                />
              </div>
            </div>
          )}
        </div>

        {/* Header Menu Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('menu')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Header Menu Settings</h2>
            </div>
            {expandedSections.menu ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.menu && (
            <div className="px-6 pb-6 space-y-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preset</label>
                  <select
                    value={settings.header_menu_preset}
                    onChange={(e) => handleChange('header_menu_preset', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Background Opacity</label>
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.header_menu_bg_opacity}
                    onChange={(e) => handleChange('header_menu_bg_opacity', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Background Color</label>
                  <input
                    type="color"
                    value={settings.header_menu_bg_color}
                    onChange={(e) => handleChange('header_menu_bg_color', e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Text Color</label>
                  <input
                    type="color"
                    value={settings.header_menu_text_color}
                    onChange={(e) => handleChange('header_menu_text_color', e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hover Color</label>
                  <input
                    type="color"
                    value={settings.header_menu_hover_color}
                    onChange={(e) => handleChange('header_menu_hover_color', e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Active Color</label>
                  <input
                    type="color"
                    value={settings.header_menu_active_color}
                    onChange={(e) => handleChange('header_menu_active_color', e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-300 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">Menu Items</label>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      header_menu_links: [...prev.header_menu_links, { label: '', page: '', enabled: true, children: [] }]
                    }))}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {settings.header_menu_links.map((link, index) => (
                    <div key={index} className="space-y-2 p-3 border border-slate-200 rounded-lg">
                      <div className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            header_menu_links: prev.header_menu_links.map((l, i) => i === index ? { ...l, label: e.target.value } : l)
                          }))}
                          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Display Name"
                        />
                        <input
                          type="text"
                          value={link.page}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            header_menu_links: prev.header_menu_links.map((l, i) => i === index ? { ...l, page: e.target.value } : l)
                          }))}
                          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Page (e.g., games)"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={link.enabled !== false}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              header_menu_links: prev.header_menu_links.map((l, i) => i === index ? { ...l, enabled: e.target.checked } : l)
                            }))}
                          />
                          Enabled
                        </label>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSettings(prev => { const arr=[...prev.header_menu_links]; if(index>0){ [arr[index-1],arr[index]]=[arr[index],arr[index-1]];} return { ...prev, header_menu_links: arr };})} className="px-2 py-1 border rounded">↑</button>
                          <button onClick={() => setSettings(prev => { const arr=[...prev.header_menu_links]; if(index<arr.length-1){ [arr[index+1],arr[index]]=[arr[index],arr[index+1]];} return { ...prev, header_menu_links: arr };})} className="px-2 py-1 border rounded">↓</button>
                          <button onClick={() => setSettings(prev => ({ ...prev, header_menu_links: prev.header_menu_links.filter((_, i) => i !== index) }))} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="pl-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-600">Sub-Menu</span>
                          <button
                            onClick={() => setSettings(prev => ({
                              ...prev,
                              header_menu_links: prev.header_menu_links.map((l, i) => i === index ? { ...l, children: [...(l.children || []), { label: '', page: '', enabled: true }] } : l)
                            }))}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                          >
                            <Plus className="w-3 h-3" /> Add Sub-Item
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(link.children || []).map((child, cIndex) => (
                            <div key={cIndex} className="flex gap-2 items-center">
                              <input
                                type="text"
                                value={child.label}
                                onChange={(e) => setSettings(prev => ({
                                  ...prev,
                                  header_menu_links: prev.header_menu_links.map((l, i) => {
                                    if (i !== index) return l;
                                    const children = [...(l.children || [])];
                                    children[cIndex] = { ...children[cIndex], label: e.target.value };
                                    return { ...l, children };
                                  })
                                }))}
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded"
                                placeholder="Sub-item Name"
                              />
                              <input
                                type="text"
                                value={child.page}
                                onChange={(e) => setSettings(prev => ({
                                  ...prev,
                                  header_menu_links: prev.header_menu_links.map((l, i) => {
                                    if (i !== index) return l;
                                    const children = [...(l.children || [])];
                                    children[cIndex] = { ...children[cIndex], page: e.target.value };
                                    return { ...l, children };
                                  })
                                }))}
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded"
                                placeholder="Page (e.g., about)"
                              />
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={child.enabled !== false}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    header_menu_links: prev.header_menu_links.map((l, i) => {
                                      if (i !== index) return l;
                                      const children = [...(l.children || [])];
                                      children[cIndex] = { ...children[cIndex], enabled: e.target.checked };
                                      return { ...l, children };
                                    })
                                  }))}
                                /> Enabled
                              </label>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setSettings(prev => ({
                                  ...prev,
                                  header_menu_links: prev.header_menu_links.map((l, i) => {
                                    if (i !== index) return l;
                                    const children = [...(l.children || [])];
                                    if (cIndex > 0) [children[cIndex-1], children[cIndex]] = [children[cIndex], children[cIndex-1]];
                                    return { ...l, children };
                                  })
                                }))} className="px-2 py-1 border rounded">↑</button>
                                <button onClick={() => setSettings(prev => ({
                                  ...prev,
                                  header_menu_links: prev.header_menu_links.map((l, i) => {
                                    if (i !== index) return l;
                                    const children = [...(l.children || [])];
                                    if (cIndex < children.length - 1) [children[cIndex+1], children[cIndex]] = [children[cIndex], children[cIndex+1]];
                                    return { ...l, children };
                                  })
                                }))} className="px-2 py-1 border rounded">↓</button>
                                <button onClick={() => setSettings(prev => ({
                                  ...prev,
                                  header_menu_links: prev.header_menu_links.map((l, i) => {
                                    if (i !== index) return l;
                                    const children = (l.children || []).filter((_, j) => j !== cIndex);
                                    return { ...l, children };
                                  })
                                }))} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Remove">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {(link.children || []).length === 0 && (
                            <p className="text-xs text-slate-500">No sub-items. Click "Add Sub-Item".</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tracking & Custom Code Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('tracking')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Tracking & Custom Code</h2>
            </div>
            {expandedSections.tracking ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.tracking && (
            <div className="px-6 pb-6 space-y-8 border-t border-slate-200">
              <div className="mt-4">
                <SnippetManager
                  title="Head Code Snippets"
                  description="Scripts and meta tags to be injected into the <head> section (e.g., Google Analytics, Meta Pixel)."
                  snippets={settings.tracking_head_snippets}
                  placement="head"
                  onChange={(snippets) => handleChange('tracking_head_snippets', snippets)}
                />
              </div>
              <div className="border-t border-slate-200 pt-8">
                <SnippetManager
                  title="Body Code Snippets"
                  description="Scripts and content to be injected immediately after the opening <body> tag (e.g., GTM noscript)."
                  snippets={settings.tracking_body_snippets}
                  placement="body"
                  onChange={(snippets) => handleChange('tracking_body_snippets', snippets)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('footer')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Footer Settings</h2>
            </div>
            {expandedSections.footer ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.footer && (
            <div className="px-6 pb-6 space-y-6 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Introduction
                </label>
                <textarea
                  value={settings.footer_company_intro}
                  onChange={(e) => handleChange('footer_company_intro', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  rows={3}
                  placeholder="Experience the ultimate escape room adventure..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Short description that appears in the footer
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Copyright Text
                </label>
                <input
                  type="text"
                  value={settings.footer_copyright_text}
                  onChange={(e) => handleChange('footer_copyright_text', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="EscapeZone. All rights reserved."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Copyright text (year and © symbol will be added automatically)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Opening Hours
                  </label>
                  <button
                    onClick={addOpeningHour}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Hours
                  </button>
                </div>
                <div className="space-y-3">
                  {settings.footer_opening_hours.map((hour, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={hour.days}
                          onChange={(e) => updateOpeningHour(index, 'days', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                          placeholder="Monday - Thursday"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={hour.hours}
                          onChange={(e) => updateOpeningHour(index, 'hours', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                          placeholder="10:00 AM - 11:00 PM"
                        />
                      </div>
                      <button
                        onClick={() => removeOpeningHour(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {settings.footer_opening_hours.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                      No opening hours added. Click "Add Hours" to add entries.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Quick Links
                  </label>
                  <button
                    onClick={addQuickLink}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Link
                  </button>
                </div>
                <div className="space-y-3">
                  {settings.footer_quick_links.map((link, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={link.label}
                          onChange={(e) => updateQuickLink(index, 'label', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                          placeholder="Our Games"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={link.page}
                          onChange={(e) => updateQuickLink(index, 'page', e.target.value)}
                          className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                          placeholder="games"
                        />
                      </div>
                      <button
                        onClick={() => removeQuickLink(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {settings.footer_quick_links.length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                      No quick links added. Click "Add Link" to add entries.
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Page values: home, games, lobby-games, merchandise, about, contact, book
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Video Order Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('videoOrder')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Video Order Settings</h2>
            </div>
            {expandedSections.videoOrder ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.videoOrder && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Title
                </label>
                <input
                  type="text"
                  value={settings.video_order_hero_title}
                  onChange={(e) => handleChange('video_order_hero_title', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Order Your Game Video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Subtitle
                </label>
                <input
                  type="text"
                  value={settings.video_order_hero_subtitle}
                  onChange={(e) => handleChange('video_order_hero_subtitle', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Relive your escape room experience with professional video footage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Background Image
                </label>
                <FileUpload
                  currentImageUrl={settings.video_order_hero_background}
                  onUploadComplete={(url) => handleChange('video_order_hero_background', url)}
                  folder="video-order"
                  accept="image/*"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Recommended: 1920x1080px or larger
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Pricing Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      1st Option Price (AED)
                    </label>
                    <input
                      type="number"
                      value={settings.video_order_pricing_1hour}
                      onChange={(e) => handleChange('video_order_pricing_1hour', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="0"
                      step="0.01"
                    />
                    <label className="block text-xs font-medium text-slate-700 mt-3 mb-1">Minutes</label>
                    <input
                      type="number"
                      value={settings.video_order_duration_1_minutes}
                      onChange={(e) => handleChange('video_order_duration_1_minutes', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="15"
                      step="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      2nd Option Price (AED)
                    </label>
                    <input
                      type="number"
                      value={settings.video_order_pricing_2hour}
                      onChange={(e) => handleChange('video_order_pricing_2hour', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="0"
                      step="0.01"
                    />
                    <label className="block text-xs font-medium text-slate-700 mt-3 mb-1">Minutes</label>
                    <input
                      type="number"
                      value={settings.video_order_duration_2_minutes}
                      onChange={(e) => handleChange('video_order_duration_2_minutes', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="15"
                      step="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      3rd Option Price (AED)
                    </label>
                    <input
                      type="number"
                      value={settings.video_order_pricing_3hour}
                      onChange={(e) => handleChange('video_order_pricing_3hour', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="0"
                      step="0.01"
                    />
                    <label className="block text-xs font-medium text-slate-700 mt-3 mb-1">Minutes</label>
                    <input
                      type="number"
                      value={settings.video_order_duration_3_minutes}
                      onChange={(e) => handleChange('video_order_duration_3_minutes', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                      min="15"
                      step="5"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Delivery Options</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Email Delivery
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.video_order_delivery_email}
                        onChange={(e) => handleChange('video_order_delivery_email', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Download Link
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.video_order_delivery_link}
                        onChange={(e) => handleChange('video_order_delivery_link', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={settings.video_order_contact_phone}
                      onChange={(e) => handleChange('video_order_contact_phone', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                      placeholder="+971-50-83-22799"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={settings.video_order_contact_whatsapp}
                      onChange={(e) => handleChange('video_order_contact_whatsapp', e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                      placeholder="971501234567"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Enter in international format without + or spaces
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Terms & Conditions Text
                </label>
                <textarea
                  value={settings.video_order_terms_text}
                  onChange={(e) => handleChange('video_order_terms_text', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Terms and conditions for video orders..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  This text will be shown to users before they submit their order
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Contact Page Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('contactPage')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Contact Page Settings</h2>
            </div>
            {expandedSections.contactPage ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.contactPage && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Title
                </label>
                <input
                  type="text"
                  value={settings.contact_hero_title}
                  onChange={(e) => handleChange('contact_hero_title', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Get in Touch"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Subtitle
                </label>
                <input
                  type="text"
                  value={settings.contact_hero_subtitle}
                  onChange={(e) => handleChange('contact_hero_subtitle', e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="We'd love to hear from you"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hero Background Image
                </label>
                <FileUpload
                  currentImageUrl={settings.contact_hero_background}
                  onUploadComplete={(url) => handleChange('contact_hero_background', url)}
                  folder="contact"
                  accept="image/*"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Recommended: 1920x1080px or larger
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Page Components</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Show Contact Form
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.contact_show_form}
                        onChange={(e) => handleChange('contact_show_form', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Show Map
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.contact_show_map}
                        onChange={(e) => handleChange('contact_show_map', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                    </label>
                  </div>
                </div>
              </div>

              {settings.contact_show_map && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Google Maps Embed URL
                  </label>
                  <input
                    type="text"
                    value={settings.contact_map_embed_url}
                    onChange={(e) => handleChange('contact_map_embed_url', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                    placeholder="https://www.google.com/maps/embed?pb=..."
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Get embed URL from Google Maps → Share → Embed a map
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional Information
                </label>
                <textarea
                  value={settings.contact_additional_info}
                  onChange={(e) => handleChange('contact_additional_info', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900 placeholder-slate-400"
                  placeholder="Additional contact information, directions, parking info, etc."
                />
                <p className="text-xs text-slate-500 mt-1">
                  This text will be shown below the contact form
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">FAQ Blocks</label>
                  <button onClick={addContactFaq} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add FAQ
                  </button>
                </div>
                <div className="space-y-4">
                  {settings.contact_faqs.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => updateContactFaq(index, 'question', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Do I need to book in advance?"
                      />
                      <div className="flex gap-2 items-start">
                        <textarea
                          value={item.answer}
                          onChange={(e) => updateContactFaq(index, 'answer', e.target.value)}
                          rows={3}
                          className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="We highly recommend booking in advance to secure your preferred time slot."
                        />
                        <button onClick={() => removeContactFaq(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* About Page Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('aboutPage')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">About Page</h2>
            </div>
            {expandedSections.aboutPage ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.aboutPage && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Enable About Page</label>
                  <p className="text-xs text-slate-500">Toggle visibility of the About page content</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.about_enabled}
                    onChange={(e) => handleChange('about_enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Title</label>
                  <input
                    type="text"
                    value={settings.about_title}
                    onChange={(e) => handleChange('about_title', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="About Us"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Subtitle</label>
                  <input
                    type="text"
                    value={settings.about_subtitle}
                    onChange={(e) => handleChange('about_subtitle', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Discover our story"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Our Story Title</label>
                  <input
                    type="text"
                    value={settings.about_story_title}
                    onChange={(e) => handleChange('about_story_title', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Our Story"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Media Type</label>
                  <select
                    value={settings.about_media_type}
                    onChange={(e) => handleChange('about_media_type', e.target.value as any)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Our Story Content</label>
                <textarea
                  value={settings.about_story_content}
                  onChange={(e) => handleChange('about_story_content', e.target.value)}
                  rows={5}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Write your company story..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mission Title</label>
                  <input
                    type="text"
                    value={settings.about_mission_title}
                    onChange={(e) => handleChange('about_mission_title', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Our Mission"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vision Title</label>
                  <input
                    type="text"
                    value={settings.about_vision_title}
                    onChange={(e) => handleChange('about_vision_title', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Our Vision"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Mission Content</label>
                  <textarea
                    value={settings.about_mission_content}
                    onChange={(e) => handleChange('about_mission_content', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="We create story-driven escape experiences that feel cinematic, immersive, and unforgettable."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vision Content</label>
                  <textarea
                    value={settings.about_vision_content}
                    onChange={(e) => handleChange('about_vision_content', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="To become the region's benchmark for premium horror escape-room storytelling."
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">Values</label>
                  <button onClick={addAboutValue} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Value
                  </button>
                </div>
                <div className="space-y-4">
                  {settings.about_values.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateAboutValue(index, 'title', e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Excellence"
                        />
                        <input
                          type="text"
                          value={item.icon}
                          onChange={(e) => updateAboutValue(index, 'icon', e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Target"
                        />
                        <button onClick={() => removeAboutValue(index)} className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-slate-200">
                          Remove
                        </button>
                      </div>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateAboutValue(index, 'description', e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="We obsess over detail so every room feels premium from entry to finale."
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">About Media</label>
                <FileUpload
                  currentImageUrl={settings.about_media_url}
                  onUploadComplete={(url) => handleChange('about_media_url', url)}
                  folder="about"
                  accept="image/*,video/*"
                />
                {settings.about_media_type === 'video' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Poster Image (optional)</label>
                      <FileUpload
                        currentImageUrl={settings.about_media_poster_url}
                        onUploadComplete={(url) => handleChange('about_media_poster_url', url)}
                        folder="about"
                        accept="image/*"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Media Alt Text</label>
                      <input
                        type="text"
                        value={settings.about_media_alt}
                        onChange={(e) => handleChange('about_media_alt', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Descriptive text"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('blogPage')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Blog Page</h2>
            </div>
            {expandedSections.blogPage ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.blogPage && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Title</label>
                  <input
                    type="text"
                    value={settings.blog_hero_title}
                    onChange={(e) => handleChange('blog_hero_title', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Blog"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Hero Subtitle</label>
                  <input
                    type="text"
                    value={settings.blog_hero_subtitle}
                    onChange={(e) => handleChange('blog_hero_subtitle', e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Stories, tips, and insights from the world of escape rooms"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">Fallback Articles</label>
                  <button onClick={addBlogFallbackPost} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                    Add Article
                  </button>
                </div>
                <div className="space-y-4">
                  {settings.blog_fallback_posts.map((item, index) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateBlogFallbackPost(index, 'title', e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="Article title"
                        />
                        <input
                          type="text"
                          value={item.slug}
                          onChange={(e) => updateBlogFallbackPost(index, 'slug', e.target.value)}
                          className="px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="article-slug"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={item.author_name}
                            onChange={(e) => updateBlogFallbackPost(index, 'author_name', e.target.value)}
                            className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            placeholder="DarkRoom"
                          />
                          <button onClick={() => removeBlogFallbackPost(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={item.image_url}
                        onChange={(e) => updateBlogFallbackPost(index, 'image_url', e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="https://..."
                      />
                      <textarea
                        value={item.excerpt}
                        onChange={(e) => updateBlogFallbackPost(index, 'excerpt', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Short article summary"
                      />
                      <textarea
                        value={item.content}
                        onChange={(e) => updateBlogFallbackPost(index, 'content', e.target.value)}
                        rows={5}
                        className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Full fallback article content"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* OAuth Settings Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <button
            onClick={() => toggleSection('oauth')}
            className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary-500" />
              <h2 className="text-xl font-semibold text-slate-900">Authentication Providers</h2>
            </div>
            {expandedSections.oauth ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {expandedSections.oauth && (
            <div className="px-6 pb-6 space-y-4 border-t border-slate-200">
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Google Sign-In</label>
                    <p className="text-xs text-slate-500">Allow users to sign in with their Google account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.oauth_google_enabled}
                      onChange={(e) => handleChange('oauth_google_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Facebook Sign-In</label>
                    <p className="text-xs text-slate-500">Allow users to sign in with their Facebook account</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.oauth_facebook_enabled}
                      onChange={(e) => handleChange('oauth_facebook_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apple Sign-In</label>
                    <p className="text-xs text-slate-500">Allow users to sign in with their Apple ID</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.oauth_apple_enabled}
                      onChange={(e) => handleChange('oauth_apple_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Maximum Providers Displayed
                  </label>
                  <input
                    type="number"
                    value={settings.oauth_max_providers}
                    onChange={(e) => handleChange('oauth_max_providers', parseInt(e.target.value) || 2)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-slate-900"
                    min="0"
                    max="5"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Limit the number of social login buttons shown on the login page (Default: 2)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
