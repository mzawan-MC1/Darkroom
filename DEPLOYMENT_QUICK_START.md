# Quick Start: Deploy to SiteGround

## 🚀 Fast Track Deployment Guide

This is a condensed version for quick deployment. For detailed instructions, see `SITEGROUND_DEPLOYMENT_GUIDE.md`.

---

## Prerequisites Checklist

- [x] Supabase database operational (Already done!)
- [x] SiteGround hosting account
- [x] FTP/SFTP credentials from SiteGround
- [x] Domain configured (optional)

---

## Step 1: Build Production Files (5 minutes)

```bash
# Navigate to project directory
cd /path/to/project

# Install dependencies (if needed)
npm install

# Build for production
npm run build
```

**Result:** Production files created in `dist/` folder

---

## Step 2: Get FTP Credentials (2 minutes)

1. Log into SiteGround
2. Go to **Site Tools** → **Dev** → **FTP Accounts Manager**
3. Note your credentials:
   - Host: `your-domain.com` or IP
   - Username: `your-username`
   - Password: `your-password`
   - Port: 21 (FTP) or 22 (SFTP)

---

## Step 3: Upload Files via FTP (5 minutes)

### Using FileZilla (or any FTP client):

1. **Connect:**
   - Host: Your FTP host
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 or 22

2. **Navigate:**
   - Remote: Go to `public_html/`
   - Local: Go to your project's `dist/` folder

3. **Upload:**
   - Select ALL files inside `dist/`
   - Drag to `public_html/`
   - Wait for upload to complete

**Important:** Upload the CONTENTS of dist/, not the dist/ folder itself.

---

## Step 4: Configure .htaccess (3 minutes)

Create or update `.htaccess` file in `public_html/`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
</IfModule>
```

**Method:**
- Create file locally
- Upload via FTP to `public_html/.htaccess`

---

## Step 5: Enable SSL (2 minutes)

1. Go to SiteGround **Site Tools**
2. Navigate to **Security** → **SSL Manager**
3. Click **Install Let's Encrypt** (FREE)
4. Enable **HTTPS Enforce**

---

## Step 6: Enable Caching (2 minutes)

1. Go to **Site Tools** → **Speed** → **Caching**
2. Enable:
   - Static Cache
   - Dynamic Cache
   - Memcached (if available)

---

## Step 7: Test Your Site (5 minutes)

1. Visit `https://your-domain.com`
2. Test key features:
   - [ ] Homepage loads
   - [ ] Navigation works
   - [ ] Games page displays
   - [ ] Login/Register works
   - [ ] Booking system functional
   - [ ] Admin panel accessible

---

## Total Time: ~25 minutes

---

## Troubleshooting

### Blank Page?
- Check browser console for errors
- Verify all files uploaded
- Clear browser cache

### 404 on Refresh?
- Verify `.htaccess` is uploaded
- Check rewrite rules

### API Errors?
- Verify environment variables in build
- Check Supabase connection

---

## Database Information

**Your database is already configured and operational!**

- **Platform:** Supabase
- **URL:** `https://aqqgjpjyubxdqqsekqxf.supabase.co`
- **Tables:** 39 (all with RLS enabled)
- **Status:** ✅ Production Ready

**No additional database configuration needed!**

---

## Support

- **Detailed Guide:** See `SITEGROUND_DEPLOYMENT_GUIDE.md`
- **Database Info:** See `DATABASE_MIGRATION_SUMMARY.md`
- **SiteGround Support:** 24/7 Live Chat
- **Supabase Support:** [discord.supabase.com](https://discord.supabase.com)

---

## Post-Deployment Checklist

After successful deployment:

- [ ] SSL enabled and HTTPS working
- [ ] Custom domain configured (if applicable)
- [ ] Caching enabled
- [ ] All pages load correctly
- [ ] User registration working
- [ ] Booking system functional
- [ ] Admin panel accessible
- [ ] Email notifications working
- [ ] Payment processing tested
- [ ] Mobile responsive design verified

---

## Next Steps

1. **Monitor Performance:**
   - Check SiteGround analytics
   - Review Supabase dashboard
   - Monitor error logs

2. **Setup Backups:**
   - Enable daily backups in SiteGround
   - Export Supabase data weekly

3. **Marketing:**
   - Submit sitemap to Google
   - Configure Google Analytics
   - Set up social media links

---

## Quick Commands

```bash
# Rebuild and redeploy
npm run build
# Then upload dist/ contents via FTP

# Check environment variables
cat .env

# Test build locally
npm run preview
```

---

**You're ready to go live! 🚀**

For any issues, refer to the comprehensive guides or contact support.
