import { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  Gamepad2,
  ShoppingBag,
  FileText,
  Users,
  Megaphone,
  Tablet,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  CreditCard,
  ChevronDown,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import DashboardOverview from './DashboardOverview';
import GamesManagement from './GamesManagement';
import GameProfileManagement from './GameProfileManagement';
import EnhancedBookingsManagement from './EnhancedBookingsManagement';
import CalendarView from './CalendarView';
import ReportsAnalytics from './ReportsAnalytics';
import InvoiceManagement from './InvoiceManagement';
import MerchandiseManagement from './MerchandiseManagement';
import WaiversManagement from './WaiversManagement';
import WaiverTemplatesManagement from './WaiverTemplatesManagement';
import PromotionsManagement from './PromotionsManagement';
import CMSManagement from './CMSManagement';
import UsersManagement from './UsersManagement';
import RolesManagement from './RolesManagement';
import POSSystem from './POSSystem';
import LobbyGamesManagement from './LobbyGamesManagement';
import LobbyGamePassesManagement from './LobbyGamePassesManagement';
import SiteSettings from './SiteSettings';
import SEOSettings from './SEOSettings';
import TestimonialsManagement from './TestimonialsManagement';
import ChallengeSectionSettings from './ChallengeSectionSettings';
import EmailSettings from './EmailSettings';
import PaymentSettings from './PaymentSettings';
import AdminProfileSettings from './AdminProfileSettings';
import VideoRequestsManagement from './VideoRequestsManagement';
import ContactMessagesManagement from './ContactMessagesManagement';

type MenuItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  component?: React.ComponentType;
  requiredPermission?: string;
  children?: MenuItem[];
};

const allMenuItems: MenuItem[] = [
  { 
    id: 'dashboard', 
    label: 'Dashboard', 
    icon: <LayoutDashboard />, 
    component: DashboardOverview, 
    requiredPermission: 'dashboard.view' 
  },
  {
    id: 'escape-room',
    label: 'Escape Room',
    icon: <Gamepad2 />,
    children: [
      { id: 'games', label: 'Games', component: GamesManagement, requiredPermission: 'games.view' },
      { id: 'bookings', label: 'Bookings', component: EnhancedBookingsManagement, requiredPermission: 'bookings.view' },
      { id: 'calendar', label: 'Calendar', component: CalendarView, requiredPermission: 'calendar.view' },
      { id: 'video-requests', label: 'Video Request', component: VideoRequestsManagement, requiredPermission: 'orders.view' },
    ]
  },
  {
    id: 'waiver-management',
    label: 'Waiver Management',
    icon: <FileText />,
    children: [
      { id: 'waiver-templates', label: 'Waiver Templates', component: WaiverTemplatesManagement, requiredPermission: 'waiver_templates.view' },
      { id: 'signed-waivers', label: 'Signed Waivers', component: WaiversManagement, requiredPermission: 'waivers.view' },
    ]
  },
  {
    id: 'lobby-management',
    label: 'Lobby Management',
    icon: <Tablet />,
    children: [
      { id: 'lobby-games', label: 'Lobby Games', component: LobbyGamesManagement, requiredPermission: 'lobby_games.view' },
      { id: 'lobby-passes', label: 'Lobby Passes', component: LobbyGamePassesManagement, requiredPermission: 'lobby_passes.view' },
    ]
  },
  { 
    id: 'promotions', 
    label: 'Promotions', 
    icon: <Megaphone />, 
    component: PromotionsManagement, 
    requiredPermission: 'promotions.view' 
  },
  {
    id: 'customer-support',
    label: 'Customer Support',
    icon: <LifeBuoy />,
    children: [
      { id: 'contact-messages', label: 'Contact Messages', component: ContactMessagesManagement, requiredPermission: 'site_settings.view' },
      { id: 'testimonials', label: 'Testimonials', component: TestimonialsManagement, requiredPermission: 'site_settings.view' },
    ]
  },
  {
    id: 'point-of-sale',
    label: 'Point of Sale',
    icon: <ShoppingBag />,
    children: [
      { id: 'pos', label: 'POS', component: POSSystem, requiredPermission: 'pos.view' },
      { id: 'merchandise', label: 'Merchandise', component: MerchandiseManagement, requiredPermission: 'merchandise.view' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: <CreditCard />,
    children: [
      { id: 'invoices', label: 'Invoices', component: InvoiceManagement, requiredPermission: 'orders.view' },
      { id: 'reports', label: 'Reports & Analytics', component: ReportsAnalytics, requiredPermission: 'reports.view' },
    ]
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <Users />,
    children: [
      { id: 'users', label: 'Users', component: UsersManagement, requiredPermission: 'users.view' },
      { id: 'roles', label: 'Roles', component: RolesManagement, requiredPermission: 'roles.view' },
    ]
  },
  {
    id: 'site-settings-group',
    label: 'Site Settings',
    icon: <Settings />,
    children: [
      { id: 'cms', label: 'CMS', component: CMSManagement, requiredPermission: 'pages.view' },
      { id: 'seo-settings', label: 'SEO Settings', component: SEOSettings, requiredPermission: 'seo.view' },
      { id: 'site-settings', label: 'Site Settings', component: SiteSettings, requiredPermission: 'site_settings.view' },
      { id: 'challenge-section', label: 'Challenge Section', component: ChallengeSectionSettings, requiredPermission: 'site_settings.view' },
      { id: 'email-settings', label: 'Email Settings', component: EmailSettings, requiredPermission: 'email_settings.view' },
      { id: 'payment-settings', label: 'Payment Settings', component: PaymentSettings, requiredPermission: 'payment_settings.view' },
      { id: 'profile-settings', label: 'Profile Settings', component: AdminProfileSettings },
    ]
  }
];

function AdminDashboardContent() {
  const { profile, activeRole, signOut, hasPermission } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  const isSubRoute = location.pathname.includes('/admin/game-profile/');

  // Filter menu items based on permissions
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items
      .filter(item => {
        // If item has children, check if any child is accessible
        if (item.children) {
          const accessibleChildren = filterMenuItems(item.children);
          // Only keep parent if it has accessible children or no permission requirement itself
          // But usually parent permission isn't strict if children are accessible, 
          // unless parent specifically hides a section. 
          // Here we assume if any child is visible, parent should be visible.
          if (accessibleChildren.length > 0) {
            item.children = accessibleChildren;
            return true;
          }
          return false;
        }
        
        // Leaf node check
        if (!item.requiredPermission) return true;
        return hasPermission(item.requiredPermission);
      })
      .map(item => {
        // Flatten single children if requested (though prompt said "Parent items should NOT show a dropdown if they only have ONE child (flatten those)")
        // Let's handle flattening in the filter or render. 
        // If we modify the structure here, we need to be careful.
        // Let's do it: if 1 child, promote child properties to parent (except ID if we want to keep structure?)
        // Actually, if we flatten, the parent becomes the child.
        if (item.children && item.children.length === 1) {
          const child = item.children[0];
          return {
            ...child,
            icon: item.icon,
            label: child.label,
          };
        }
        return item;
      });
  };

  // Memoize filtered menu items to avoid re-calculation
  // However, permissions shouldn't change often.
  // We need a deep copy to avoid mutating the original allMenuItems when filtering/flattening
  const getFilteredMenuItems = () => {
    // Helper to deeply clone and filter
    const processItems = (items: MenuItem[]): MenuItem[] => {
      const processed: MenuItem[] = [];
      
      for (const item of items) {
        // Check permission
        const hasAccess = !item.requiredPermission || hasPermission(item.requiredPermission);
        
        if (!hasAccess && !item.children) continue; // Skip inaccessible leaf nodes

        const newItem: MenuItem = { ...item };
        
        if (newItem.children) {
          newItem.children = processItems(newItem.children);
          
          if (newItem.children.length === 0) {
            continue; // Skip parent with no accessible children
          }
          
          if (newItem.children.length === 1) {
            // Flatten
            const child = newItem.children[0];
            newItem.id = child.id;
            newItem.component = child.component;
            newItem.label = child.label; // Or keep parent label? "Finance -> Invoices" -> "Invoices". 
            // If I have "Escape Room -> Games", I probably want "Games".
            // If I have "Dashboard" (no children), it stays.
            // newItem.icon remains parent's icon
            delete newItem.children;
            
            // Re-attach component from original source because JSON clone would fail if we used it, 
            // but here we are iterating original array, so 'child' has the component.
            // We are strictly operating on references from 'items', so components are preserved.
          }
        }
        
        processed.push(newItem);
      }
      
      return processed;
    };

    return processItems(allMenuItems);
  };

  const menuItems = getFilteredMenuItems();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const toggleMenu = (menuId: string) => {
    // Accordion behavior: only one menu expanded at a time
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? [] // Close if clicking the open one
        : [menuId] // Open the new one, close others
    );
  };

  // Find active component and label recursively
  const findActiveItem = (items: MenuItem[], id: string): MenuItem | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findActiveItem(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const activeMenuItem = findActiveItem(menuItems, activeTab);
  const ActiveComponent = activeMenuItem?.component || null;

  // Auto-expand menu if active tab is inside it
  useEffect(() => {
    const expandActiveMenu = () => {
      // Find the menu group that contains the active tab
      const activeGroup = menuItems.find(item => 
        item.children && item.children.some(child => child.id === activeTab)
      );
      
      if (activeGroup) {
        setExpandedMenus([activeGroup.id]);
      }
    };
    expandActiveMenu();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 text-white transition-all duration-300 flex flex-col border-r border-red-900/30 flex-shrink-0`}
      >
        <div className="p-6 border-b border-red-900/30 flex items-center justify-between h-20">
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-white truncate">Escape Room</h1>
              <p className="text-sm text-slate-400 truncate">Management System</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-black/50 hover:border-primary-500/50 rounded-lg transition-colors border border-transparent flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {menuItems.map((item) => {
            // Leaf Item
            if (!item.children) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all border mb-1 group relative ${
                    activeTab === item.id && !isSubRoute
                      ? 'bg-primary-500 text-white border-primary-500 shadow-lg shadow-primary-500/20'
                      : 'text-slate-400 hover:bg-black/50 hover:text-white hover:border-primary-500/50 hover:shadow-primary-500/20 border-transparent'
                  }`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{item.icon}</span>
                  {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
                </button>
              );
            }

            // Parent Item with Children
            const isExpanded = expandedMenus.includes(item.id);
            const isActiveParent = item.children.some(child => child.id === activeTab);
            
            return (
              <div key={item.id} className="mb-2">
                <button
                  onClick={() => sidebarOpen ? toggleMenu(item.id) : setSidebarOpen(true)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all border mb-1 ${
                    isActiveParent
                      ? 'text-white bg-slate-800 border-slate-700'
                      : 'text-slate-400 hover:bg-black/50 hover:text-white border-transparent'
                  }`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center ${isActiveParent ? 'text-primary-500' : ''}`}>
                      {item.icon}
                    </span>
                    {sidebarOpen && <span className="font-medium truncate">{item.label}</span>}
                  </div>
                  {sidebarOpen && (
                    <span className="flex-shrink-0 ml-2">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  )}
                </button>
                
                {/* Submenu */}
                {sidebarOpen && isExpanded && (
                  <div className="ml-4 pl-4 border-l border-slate-700 space-y-1 mt-1 mb-2">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => handleTabChange(child.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                          activeTab === child.id
                            ? 'text-primary-400 font-medium bg-primary-500/10'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <span className="truncate">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-red-900/30 bg-slate-900 z-10">
          <div
            className={`${
              sidebarOpen ? 'flex items-center gap-3' : 'flex justify-center'
            } mb-4 px-4 py-3 bg-slate-800/50 rounded-lg`}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
                {profile?.full_name.charAt(0).toUpperCase()}
              </div>
            )}
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate text-white text-sm">{profile?.full_name}</p>
                <p className="text-xs text-slate-400 truncate">{activeRole?.role_name || 'Customer'}</p>
              </div>
            )}
          </div>
          <button
            onClick={signOut}
            className={`w-full flex items-center ${
              sidebarOpen ? 'gap-3' : 'justify-center'
            } px-4 py-3 text-slate-400 hover:bg-black/50 hover:text-white hover:border-primary-500/50 rounded-lg transition-all border border-transparent`}
            title="Sign Out"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-slate-900 h-screen flex flex-col">
        <Routes>
          <Route path="/admin/game-profile/:gameId" element={<GameProfileManagement />} />
          <Route path="*" element={
            <>
              <header className="bg-slate-900 border-b border-slate-700 px-8 py-6 shadow-sm flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {activeMenuItem?.label}
                    </h2>
                    <p className="text-slate-300 mt-1">
                      Manage your escape room business
                    </p>
                  </div>
                </div>
              </header>
              <div className="p-8 flex-1 overflow-auto">
                {ActiveComponent ? (
                  <ActiveComponent />
                ) : (
                  <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-lg mx-auto mt-10">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-slate-600 mb-6">
                      You do not have permission to access this page. Please contact your administrator if you believe this is an error.
                    </p>
                  </div>
                )}
              </div>
            </>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return <AdminDashboardContent />;
}
