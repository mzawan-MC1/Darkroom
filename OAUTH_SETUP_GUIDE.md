# OAuth Setup Guide - Google & Facebook Sign-In

## Current Status
OAuth providers (Google, Facebook) are **NOT YET CONFIGURED** in your Supabase project.

Users will see an error when trying to sign in with Google or Facebook until these providers are enabled in the Supabase dashboard.

---

## Quick Start (Fastest Way - 5 Minutes)

**For testing purposes, you can use Supabase's default OAuth credentials:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb/auth/providers
2. Find "Google" → Toggle **ON** → Click **Save**
3. Find "Facebook" → Toggle **ON** → Click **Save**
4. Test the sign-in buttons in your app

This uses Supabase's test credentials and works immediately. For production, follow the full setup below.

---

## Full Setup Guide

### Step 1: Configure Google OAuth

#### 1.1 Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Click "New Project"
   - Project Name: "BreakOut Escape Room" (or your app name)
   - Click "Create"

3. **Enable Google+ API (Required)**
   - In the left sidebar, go to: **APIs & Services** → **Library**
   - Search for: "Google+ API"
   - Click on it and press **Enable**

4. **Configure OAuth Consent Screen**
   - Go to: **APIs & Services** → **OAuth consent screen**
   - User Type: Select "External" (unless you have a Google Workspace)
   - Click **Create**

   **Fill in the required fields:**
   - App name: "BreakOut Escape Room"
   - User support email: Your email
   - Developer contact email: Your email
   - Click **Save and Continue**

   **Scopes (Skip this step for now):**
   - Click **Save and Continue**

   **Test users (Optional for testing):**
   - Add your email if in testing mode
   - Click **Save and Continue**

5. **Create OAuth 2.0 Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth client ID**

   **Fill in the details:**
   - Application type: **Web application**
   - Name: "BreakOut Web Client"

   **Authorized JavaScript origins:**
   ```
   https://jkidjlfoqsgklqavjvpb.supabase.co
   ```

   **Authorized redirect URIs:**
   ```
   https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback
   ```

   - Click **Create**

6. **Copy Your Credentials**
   - You'll see a popup with:
     - **Client ID**: Something like `1234567890-abcdefg.apps.googleusercontent.com`
     - **Client Secret**: Something like `GOCSPX-abc123def456`
   - Keep this window open or download the JSON

#### 1.2 Configure Google in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb
   - Navigate to: **Authentication** → **Providers**

2. **Enable Google Provider**
   - Find "Google" in the providers list
   - Click to expand settings
   - Toggle **"Google Enabled"** to **ON**

3. **Enter Your Google Credentials**
   - **Client ID**: Paste the Client ID from Google Cloud Console
   - **Client Secret**: Paste the Client Secret from Google Cloud Console
   - **Skip Nonce Check**: Leave unchecked (default)

4. **Click Save**

5. **Test Google Sign-In**
   - Go to your app's login page
   - Click the "Google" button
   - You should be redirected to Google's login page
   - After signing in, you'll be redirected back to your app

---

### Step 2: Configure Facebook OAuth

#### 2.1 Create Facebook App

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Log in with your Facebook account

2. **Create a New App**
   - Click **"Create App"** (top right corner)
   - Select **"Consumer"** (for customer-facing apps)
   - Click **Next**

   **Fill in app details:**
   - **App Name**: "BreakOut Escape Room"
   - **App Contact Email**: Your email address
   - Click **Create App**
   - Complete the security check if prompted

3. **Add Facebook Login Product**
   - From your app dashboard, find **"Add Products"** section
   - Find **"Facebook Login"**
   - Click **"Set Up"**

4. **Configure Facebook Login Settings**
   - In the left sidebar, click: **Facebook Login** → **Settings**

   **Add Valid OAuth Redirect URIs:**
   ```
   https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback
   ```

   - Scroll down and click **Save Changes**

5. **Get Your App Credentials**
   - In the left sidebar, go to: **Settings** → **Basic**
   - You'll see:
     - **App ID**: Copy this (e.g., 1234567890123456)
     - **App Secret**: Click **Show**, then copy it
   - Keep these secure

6. **Configure App Domains (Important)**
   - Still in **Settings** → **Basic**
   - Scroll to **App Domains**
   - Add your domains:
     ```
     jkidjlfoqsgklqavjvpb.supabase.co
     localhost
     ```
   - **Privacy Policy URL**: Add your privacy policy URL (required for production)
   - **Terms of Service URL**: Add your terms URL (optional)
   - Click **Save Changes**

7. **Make App Live (For Production)**
   - At the top, you'll see your app is in **Development Mode**
   - To make it public:
     - Complete all required settings
     - Add App Icon (1024x1024px)
     - Add Privacy Policy URL
     - Toggle the switch to make app **Live**

#### 2.2 Configure Facebook in Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb
   - Navigate to: **Authentication** → **Providers**

2. **Enable Facebook Provider**
   - Find "Facebook" in the providers list
   - Click to expand settings
   - Toggle **"Facebook Enabled"** to **ON**

3. **Enter Your Facebook Credentials**
   - **Facebook Client ID**: Paste the App ID from Facebook
   - **Facebook Secret**: Paste the App Secret from Facebook

4. **Click Save**

5. **Test Facebook Sign-In**
   - Go to your app's login page
   - Click the "Facebook" button
   - You should be redirected to Facebook's login page
   - After signing in, you'll be redirected back to your app

---

## Step 3: Configure Redirect URLs in Supabase

This step ensures users are redirected to the correct URL after signing in.

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb
   - Navigate to: **Authentication** → **URL Configuration**

2. **Add Site URL**
   - For development: `http://localhost:5173`
   - For production: `https://your-domain.com`

3. **Add Redirect URLs**
   Add these URLs (one per line):
   ```
   http://localhost:5173/**
   https://your-production-domain.com/**
   ```

4. **Click Save**

---

## Testing Your OAuth Setup

### Test Google Sign-In

1. Open your app's login page (http://localhost:5173 or your production URL)
2. Click the **"Google"** button
3. You should be redirected to Google's sign-in page
4. Sign in with your Google account
5. Grant permissions when asked
6. You should be redirected back to your app
7. Check that you're logged in and your profile was created

### Test Facebook Sign-In

1. Open your app's login page
2. Click the **"Facebook"** button
3. You should be redirected to Facebook's login page
4. Sign in with your Facebook account
5. Grant permissions when asked
6. You should be redirected back to your app
7. Check that you're logged in and your profile was created

### Verify in Supabase Dashboard

1. Go to: **Authentication** → **Users**
2. You should see new users created via OAuth
3. Check their metadata for provider information

---

## Troubleshooting Common Issues

### Google Sign-In Issues

**Error: "Access blocked: This app's request is invalid"**
- **Cause**: Missing or incorrect Authorized Redirect URI
- **Fix**:
  1. Go to Google Cloud Console → Credentials
  2. Edit your OAuth client
  3. Add: `https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback`
  4. Save and wait 5 minutes for changes to propagate

**Error: "redirect_uri_mismatch"**
- **Cause**: Redirect URI doesn't match exactly
- **Fix**: Ensure the URI in Google Cloud Console matches EXACTLY: `https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback`

**Error: "Google sign-in is not configured"**
- **Cause**: Provider not enabled in Supabase
- **Fix**: Go to Supabase Dashboard → Authentication → Providers → Enable Google

**Google sign-in button doesn't work**
- **Cause**: Pop-ups blocked by browser
- **Fix**: Allow pop-ups for your site, or check browser console for errors

### Facebook Sign-In Issues

**Error: "App Not Setup: This app is still in development mode"**
- **Cause**: Facebook app is in development mode
- **Fix**:
  - For testing: Add your Facebook account as a test user in Facebook Developers
  - For production: Make the app live (requires privacy policy and app review)

**Error: "Can't Load URL"**
- **Cause**: Invalid OAuth Redirect URI
- **Fix**:
  1. Go to Facebook Developers → Facebook Login → Settings
  2. Add: `https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback`
  3. Save changes

**Error: "Invalid OAuth client secret"**
- **Cause**: Wrong App Secret in Supabase
- **Fix**:
  1. Go to Facebook Developers → Settings → Basic
  2. Copy the App Secret (click "Show")
  3. Paste it exactly in Supabase Dashboard

**Facebook button redirects but login fails**
- **Cause**: App Domains not configured
- **Fix**:
  1. Go to Facebook Developers → Settings → Basic
  2. Add `jkidjlfoqsgklqavjvpb.supabase.co` to App Domains
  3. Save changes

### General Issues

**User gets logged in but profile is not created**
- **Cause**: RLS policies blocking profile creation
- **Fix**: Your app already handles this automatically through the AuthContext

**Redirect loop after OAuth login**
- **Cause**: Incorrect redirect URL configuration
- **Fix**:
  1. Go to Supabase → Authentication → URL Configuration
  2. Add your app URL to Redirect URLs
  3. Format: `http://localhost:5173/**` or `https://yourdomain.com/**`

**"Network request failed"**
- **Cause**: Browser blocking third-party cookies
- **Fix**:
  1. Enable third-party cookies in browser settings
  2. Or use a different browser for testing

---

## Production Checklist

Before launching with OAuth in production:

### Google OAuth
- [ ] Create Google Cloud project with your own credentials
- [ ] Configure OAuth consent screen with branding
- [ ] Add production redirect URIs
- [ ] Add app logo (120x120px minimum)
- [ ] Add privacy policy URL
- [ ] Test sign-in flow on multiple browsers
- [ ] Test on mobile devices
- [ ] Verify Google consent screen shows correct app name
- [ ] (Optional) Submit for Google verification if requesting sensitive scopes

### Facebook OAuth
- [ ] Create Facebook App with your own credentials
- [ ] Configure Facebook Login settings
- [ ] Add production redirect URIs
- [ ] Add app icon (1024x1024px)
- [ ] Add privacy policy URL (required)
- [ ] Add terms of service URL
- [ ] Add Data Deletion Instructions URL (required for production)
- [ ] Configure Data Protection settings
- [ ] Add all App Domains
- [ ] Test in development mode with test users
- [ ] Submit app for Facebook App Review
- [ ] Make app live after approval

### General
- [ ] Update Supabase redirect URLs with production domain
- [ ] Test OAuth flow on production domain
- [ ] Verify profile creation for new OAuth users
- [ ] Test sign-in with multiple accounts
- [ ] Test on desktop and mobile browsers
- [ ] Add OAuth providers to privacy policy
- [ ] Monitor authentication errors in Supabase dashboard
- [ ] Set up error logging for OAuth failures

---

## Important URLs for Your Project

**Supabase Project ID:** `jkidjlfoqsgklqavjvpb`

**Supabase OAuth Callback URL (use this in Google/Facebook):**
```
https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback
```

**Direct Links:**
- Supabase Dashboard: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb
- Auth Providers: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb/auth/providers
- URL Configuration: https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb/auth/url-configuration

**Application URLs:**
- Development: `http://localhost:5173`
- Production: Add your production domain here

---

## Additional Resources

### Official Documentation
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/social-login
- **Google OAuth Setup**: https://supabase.com/docs/guides/auth/social-login/auth-google
- **Facebook OAuth Setup**: https://supabase.com/docs/guides/auth/social-login/auth-facebook
- **Google Cloud Console**: https://console.cloud.google.com/
- **Facebook Developers**: https://developers.facebook.com/

### Required Information Summary

**For Google:**
- Client ID (from Google Cloud Console)
- Client Secret (from Google Cloud Console)
- Authorized Redirect URI: `https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback`

**For Facebook:**
- App ID (from Facebook Developers)
- App Secret (from Facebook Developers)
- Valid OAuth Redirect URI: `https://jkidjlfoqsgklqavjvpb.supabase.co/auth/v1/callback`

---

## Summary

Your app is already configured with Google and Facebook sign-in buttons. To make them work:

**Quick Testing (5 minutes):**
1. Go to [Supabase Auth Providers](https://supabase.com/dashboard/project/jkidjlfoqsgklqavjvpb/auth/providers)
2. Enable Google and Facebook (toggle ON and save)
3. Test the buttons in your app

**Production Setup (30-60 minutes):**
1. Create Google OAuth credentials in Google Cloud Console
2. Create Facebook App in Facebook Developers
3. Configure both in Supabase with your credentials
4. Test thoroughly
5. Complete production checklist before going live

Your app's authentication system is fully functional and will automatically create user profiles for OAuth sign-ins.
