# Deploying to Vercel - Step by Step Guide

## Prerequisites

✅ GitHub repository: https://github.com/backend-thanhlong/congno_dktp.git  
✅ Supabase account with database and storage configured

---

## Step 1: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import `backend-thanhlong/congno_dktp` repository
5. Click **"Import"**

---

## Step 2: Configure Environment Variables

**CRITICAL**: Add these environment variables in Vercel project settings:

Go to: **Settings → Environment Variables**

Add the following variables (copy from your `.env.local`):

```bash
# Database
DATABASE_URL=postgresql://postgres.zobqwdajkplklanftybk:nguyenphanhaidang@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.zobqwdajkplklanftybk:nguyenphanhaidang@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://zobqwdajkplklanftybk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYnF3ZGFqa3Bsa2xhbmZ0eWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyODg3MjYsImV4cCI6MjA4NDg2NDcyNn0.4fuyWBaQtVd34Xrp9nPPTpQAty3SlRKBc18j4qnAiwM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYnF3ZGFqa3Bsa2xhbmZ0eWJrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI4ODcyNiwiZXhwIjoyMDg0ODY0NzI2fQ.fWrVQVHw-P_wkToOEr1rldiBsR8suDMJhZ-zYtox7kA

# NextAuth
NEXTAUTH_SECRET=quanlycongno-secret-key-2026
NEXTAUTH_URL=https://your-vercel-app-url.vercel.app
```

**Important**: 
- Set all variables to **"Production"** environment
- Update `NEXTAUTH_URL` with your actual Vercel deployment URL after first deploy

---

## Step 3: Build Settings

Vercel should auto-detect Next.js. Verify:

- **Framework Preset**: Next.js
- **Build Command**: `next build` (or leave default)
- **Output Directory**: `.next` (or leave default)
- **Install Command**: `npm install` (or leave default)

---

## Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. Check build logs for any errors

---

## Common Errors & Solutions

### Error 1: "Prisma Client not generated"

**Solution**: Add build command in `vercel.json`:
```json
{
  "buildCommand": "prisma generate && next build"
}
```

### Error 2: "Environment variable DATABASE_URL not found"

**Solution**: Make sure you added all environment variables in Vercel Settings → Environment Variables

### Error 3: TypeScript build errors

**Solution**: 
1. Run `npm run build` locally to verify
2. Fix all TypeScript errors
3. Push to GitHub
4. Redeploy on Vercel

### Error 4: "Module not found"

**Solution**: 
1. Clear Vercel build cache: Settings → General → Clear Build Cache
2. Redeploy

### Error 5: Middleware deprecation warning

**Solution**: This is just a warning, not a blocker. Can be ignored for now or migrate to proxy later.

---

## Step 5: Post-Deployment

After successful deployment:

1. **Update NEXTAUTH_URL**: 
   - Copy your Vercel URL (e.g., `https://congno-dktp.vercel.app`)
   - Update `NEXTAUTH_URL` environment variable
   - Redeploy

2. **Test Login**:
   - Go to your Vercel URL
   - Try logging in with: `admin` / `admin123`

3. **Test PDF Upload**:
   - Go to `/dashboard/hoa-don`
   - Try creating invoice with PDF upload
   - Verify file appears in Supabase Storage

---

## Debugging Build Errors

If deployment fails:

1. **Check Build Logs**:
   - Click on failed deployment
   - View full build logs
   - Copy error message

2. **Test Locally**:
   ```bash
   npm run build
   ```
   If it fails locally, fix the errors first

3. **Check Environment Variables**:
   - Verify all required variables are set
   - Check for typos in variable names

4. **Contact Support**:
   - Send build logs to troubleshoot

---

## Updating Deployment

After making code changes:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically redeploy on every push to `main` branch.

---

## ✅ Deployment Checklist

Before deploying:
- [ ] All environment variables added to Vercel
- [ ] `npm run build` works locally
- [ ] Database is on Supabase (not localhost)
- [ ] Supabase storage bucket created
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] Code pushed to GitHub

---

## Need Help?

Copy the **exact error message** from Vercel build logs and send for troubleshooting.
