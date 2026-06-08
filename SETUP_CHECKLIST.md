# ✅ Setup Checklist

Follow this checklist to get your Escape Room Management System up and running!

## Step 1: Supabase Setup

- [ ] Create account at [supabase.com](https://supabase.com)
- [ ] Create a new project
- [ ] Wait for project to finish provisioning (~2 minutes)
- [ ] Copy Project URL from Settings > API
- [ ] Copy anon/public key from Settings > API

## Step 2: Local Configuration

- [ ] Create `.env` file in project root
- [ ] Add `VITE_SUPABASE_URL=your_url_here`
- [ ] Add `VITE_SUPABASE_ANON_KEY=your_key_here`
- [ ] Run `npm install` (if not done already)

## Step 3: Database Migration

The database migration has already been applied! You can verify by:

- [ ] Go to Supabase Dashboard > Table Editor
- [ ] Check that you see tables like: profiles, games, bookings, etc.

## Step 4: Start Development Server

- [ ] Run `npm run dev`
- [ ] Open browser to `http://localhost:5173`
- [ ] You should see the login page!

## Step 5: Create Your Admin Account

- [ ] Click "Don't have an account? Sign up"
- [ ] Enter your details (email, password, full name)
- [ ] Click "Create Account"
- [ ] You'll be logged in as a customer

## Step 6: Upgrade to Admin

- [ ] Go to Supabase Dashboard
- [ ] Click "Table Editor" in the left sidebar
- [ ] Select the `profiles` table
- [ ] Find your user (by email)
- [ ] Click on the row to edit
- [ ] Change `role` from `customer` to `admin`
- [ ] Save changes
- [ ] Go back to your app and refresh the page
- [ ] You should now see the Admin Dashboard! 🎉

## Step 7: Explore the System

- [ ] Click through the different menu items
- [ ] Try creating a game (Games > Add New Game)
- [ ] Create a promo code (Promotions > Create Promo Code)
- [ ] Check out the CMS (CMS > Blog Posts or Static Pages)
- [ ] View the waivers section (Waivers)
- [ ] Look at merchandise management (Merchandise)

## Common Issues & Solutions

### ❌ Can't see the login page
**Solution**: Make sure `npm run dev` is running and check for errors in the terminal

### ❌ Login returns an error
**Solutions**:
- Check that your `.env` file has the correct credentials
- Verify your Supabase project is active
- Check browser console (F12) for specific error messages

### ❌ Still seeing "Start prompting" message
**Solution**: You're seeing an old build. Clear your browser cache and refresh

### ❌ Can't access admin features after changing role
**Solution**: Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)

### ❌ Database tables don't exist
**Solution**: The migration was already applied. Check Supabase Table Editor to verify

## Next Steps After Setup

Once everything is working:

1. **Add Games**: Start by creating your escape room games
2. **Configure Pages**: Set up your About, FAQ, and policy pages
3. **Create Promo Codes**: Add some promotional codes for marketing
4. **Write Blog Posts**: Create SEO-optimized content
5. **Customize**: Modify colors, branding, etc. to match your business

## 🎯 Success Criteria

You've successfully set up the system when:

- ✅ You can see the login page
- ✅ You can create an account
- ✅ You can see the admin dashboard (after role change)
- ✅ You can navigate through all menu items
- ✅ You can create a game or promo code

## 🆘 Still Having Issues?

1. Check the [Quick Start Guide](QUICK_START.md)
2. Review the [README](README.md)
3. Check browser console for errors (F12 > Console tab)
4. Verify Supabase project is active and migrations ran
5. Make sure `.env` file is in the project root (not in src/)

---

**Time to complete**: About 10-15 minutes

**Ready?** Start with Step 1! 🚀
