# Quick Start Guide - Escape Room Management System

## 🚀 You're Almost Ready!

Your escape room management system is now fully set up. Here's what you need to do to see it running:

## Step 1: Set Up Supabase

1. **Go to Supabase**: Visit [https://supabase.com](https://supabase.com) and create a free account
2. **Create a New Project**: Click "New Project" and give it a name
3. **Wait for Setup**: It takes about 2 minutes for Supabase to provision your database
4. **Get Your Keys**: Once ready, go to Project Settings > API
   - Copy your `Project URL`
   - Copy your `anon/public` key

## Step 2: Configure Environment Variables

Create a `.env` file in your project root with your Supabase credentials:

```bash
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Step 3: Run the Database Migration

The migration has already been applied to your Supabase database. If you need to re-apply it:

1. Go to your Supabase Dashboard
2. Click on "SQL Editor"
3. The migrations are already applied!

## Step 4: Start the Development Server

```bash
npm run dev
```

The application will open at `http://localhost:5173`

## 🎉 What You'll See

### Login Page
- A beautiful login/signup interface
- Create your first account (it will be a customer by default)

### Making Yourself an Admin

After creating your account:

1. Go to Supabase Dashboard > Table Editor
2. Open the `profiles` table
3. Find your user and change the `role` from `customer` to `admin`
4. Refresh the page - you'll now see the admin dashboard!

### Admin Dashboard Features

Once you're an admin, you'll have access to:

- **Dashboard** - Overview with statistics
- **Games** - Create and manage escape room games
- **Bookings** - View and manage all bookings
- **Merchandise** - Product catalog and inventory
- **Waivers** - Digital waiver management
- **Promotions** - Promo code system
- **CMS** - Blog posts and static pages

## 📁 Project Structure

```
src/
├── lib/              # Supabase client and types
├── contexts/         # React contexts (Auth)
├── components/       # Reusable components
├── pages/
│   ├── admin/       # Admin dashboard and modules
│   └── customer/    # Customer portal
└── App.tsx          # Main app component
```

## 🔒 Security

- All tables have Row Level Security (RLS) enabled
- Role-based access control
- Optimized RLS policies for performance
- Foreign key indexes for fast queries

## 🎮 Next Steps

1. **Add Your First Game**: Go to Games > Add New Game
2. **Create Promo Codes**: Go to Promotions > Create Promo Code
3. **Set Up Blog**: Go to CMS > Blog Posts > New Post
4. **Configure Pages**: Go to CMS > Static Pages > Create Default Pages

## 💡 Features Overview

### ✅ Fully Implemented
- User authentication and role management
- Games management with full CRUD
- Bookings system
- Merchandise inventory
- Digital waivers viewing
- Promo codes with usage tracking
- Blog and content management
- Static pages with SEO

### 🚧 Coming Soon
- Calendar booking interface
- POS tablet system
- Advanced analytics with charts
- Payment gateway integration
- Email/WhatsApp notifications
- Customer booking flow

## 🆘 Troubleshooting

**Can't see the login page?**
- Make sure `npm run dev` is running
- Check that your `.env` file has the correct Supabase credentials

**Login not working?**
- Verify your Supabase project is active
- Check the browser console for errors
- Make sure the migration was applied successfully

**Role not changing?**
- You need to manually update the role in Supabase Table Editor
- Refresh the page after changing the role

## 📚 Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

**Ready to start?** Run `npm run dev` and create your first account!
