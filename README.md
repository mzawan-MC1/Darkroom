# 🎮 Escape Room Management System

A comprehensive, production-ready management system for escape room businesses in Dubai, UAE.

## ✨ Features

### 🎯 Core Functionality
- **User Authentication** - Secure login with role-based access
- **Games Management** - Create and manage escape room games with storylines, pricing, and difficulty levels
- **Booking System** - Handle reservations for general, corporate, birthday, and VIP bookings
- **Merchandise Store** - E-commerce with inventory tracking and low stock alerts
- **Digital Waivers** - Secure storage and viewing of participant waivers
- **Promo Codes** - Flexible discount system with usage tracking
- **CMS** - Blog posts and static pages with SEO optimization

### 👥 User Roles
- **Admin** - Full system access
- **Game Master** - Booking and game management
- **Customer Service** - Handle customer queries and bookings
- **Customer** - Book games, purchase merchandise, sign waivers

### 🔒 Security
- Row Level Security (RLS) on all database tables
- Optimized RLS policies for performance
- Role-based access control
- Secure authentication with Supabase

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works!)

### Setup Steps

1. **Clone and Install**
   ```bash
   npm install
   ```

2. **Configure Supabase**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create `.env` file:
     ```
     VITE_SUPABASE_URL=your_project_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Database is Ready**
   - Migrations are already applied to your Supabase database

4. **Start Development**
   ```bash
   npm run dev
   ```

5. **Create Admin Account**
   - Sign up through the web interface
   - Go to Supabase Dashboard > Table Editor > profiles
   - Change your role from `customer` to `admin`
   - Refresh the page to see the admin dashboard

## 📦 What's Included

### Database Schema
- 16+ tables with complete relationships
- Profiles, Games, Bookings, Merchandise, Orders
- Waivers, Reviews, Promo Codes
- Blog Posts, Static Pages
- POS Sessions, Lobby Games

### Admin Modules
- **Dashboard** - Real-time statistics and overview
- **Games** - Full CRUD for escape room games
- **Bookings** - Manage all reservations
- **Merchandise** - Product and inventory management
- **Waivers** - View signed waivers
- **Promotions** - Promo code management
- **CMS** - Content management system

### Technologies
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth)
- **Build**: Vite

## 📱 Screenshots

### Login Page
Beautiful, modern authentication interface with signup and login

### Admin Dashboard
Clean, professional dashboard with navigation and statistics

### Games Management
Intuitive interface for creating and managing escape room games

### Bookings Management
Comprehensive booking view with filters and status management

### Promo Codes
Powerful promo code system with tracking and analytics

## 🎨 Design Principles

- **Modern & Clean** - Professional design suitable for businesses
- **Responsive** - Works on desktop, tablet, and mobile
- **Intuitive** - Easy to navigate and use
- **Fast** - Optimized database queries and indexes
- **Secure** - Security-first architecture

## 📊 Database Performance

All security and performance issues have been fixed:
- ✅ 15+ foreign key indexes added
- ✅ All RLS policies optimized
- ✅ Function security hardened
- ✅ Query performance optimized

## 🛠️ Development

### Build for Production
```bash
npm run build
```

### Run Type Checking
```bash
npm run typecheck
```

### Lint Code
```bash
npm run lint
```

## 📚 Documentation

- [Quick Start Guide](QUICK_START.md)
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
- [Database Schema](supabase/migrations/)

### New Deployments
- Calendar booking interface
- POS tablet system
- Advanced analytics dashboard
- Payment gateway integration
- Email/WhatsApp notifications
- Customer booking flow
- Review management
- Advanced reporting

## 💼 Production Ready

This system is designed for production use with:
- Secure authentication
- Optimized database queries
- Role-based access control
- Comprehensive error handling
- Type-safe codebase

## 🤝 Support

For issues or questions:
1. Check the [Quick Start Guide](QUICK_START.md)
2. Review the [Implementation Summary](IMPLEMENTATION_SUMMARY.md)
3. Check Supabase documentation for database questions

## 📄 License

This project is ready for commercial use.

---

**Built with ❤️ for Escape Room businesses**

Ready to start? Check out the [Quick Start Guide](QUICK_START.md)!
