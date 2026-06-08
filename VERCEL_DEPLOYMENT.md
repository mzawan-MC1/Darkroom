# Deploying to Vercel

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Your GitHub repository connected to Vercel
3. Supabase project credentials

## Deployment Steps

### 1. Import Your Project

1. Go to https://vercel.com/new
2. Select "Import Git Repository"
3. Choose your repository: `zubairawan91-droid/tasjeel-escape-room`
4. Click "Import"

### 2. Configure Project Settings

Vercel will auto-detect the Vite framework. Verify these settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 3. Add Environment Variables

In the Vercel project settings, add these environment variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Where to find these:**
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon/public" key

### 4. Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Post-Deployment

### Set Up Custom Domain (Optional)

1. Go to your Vercel project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

### Update Supabase Settings

1. Go to your Supabase project
2. Navigate to Authentication > URL Configuration
3. Add your Vercel domain to "Site URL"
4. Add your Vercel domain to "Redirect URLs"

## Automatic Deployments

Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every pull request

## Monitoring

- View deployment logs in the Vercel dashboard
- Monitor performance and analytics
- Set up error tracking as needed

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Verify all environment variables are set correctly
- Ensure `npm run build` works locally

### Environment Variables Not Working
- Make sure variables start with `VITE_`
- Redeploy after adding/changing variables
- Check for typos in variable names

### 404 Errors on Refresh
- The `vercel.json` file handles SPA routing
- Ensure the file is committed to your repository
