# Deploy MindCraft to Vercel

Complete guide to deploy your MindCraft platform to Vercel in 5 minutes!

## Prerequisites

- Your code pushed to GitHub (you just did this!)
- Vercel account (free tier works perfectly)
- Supabase project already set up

## Step 1: Push to GitHub First

Make sure your code is pushed to GitHub:
```bash
git push -u origin main
```

## Step 2: Connect to Vercel

1. Go to: https://vercel.com
2. Sign up or log in (use GitHub to link accounts)
3. Click "Add New Project"

## Step 3: Import GitHub Repository

1. Find and select `Ayyappa-reddy/MindCraft`
2. Click "Import"

## Step 4: Configure Project

### Framework Preset
- Vercel auto-detects Next.js ✅

### Root Directory
- Leave as `.` (root)

### Build Settings
- Build Command: `npm run build` (auto-detected)
- Output Directory: `.next` (auto-detected)

### Environment Variables

**Click "Environment Variables" and add these:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Piston API (no config needed, it's free!)
# No environment variables required for Piston API
```

⚠️ **Important**: Get these from your Supabase Dashboard:
- Project URL: Settings > API > Project URL
- Anon Key: Settings > API > anon/public key
- Service Role Key: Settings > API > service_role key (secret!)

### Node.js Version

Set to `20` or latest (Vercel uses 20 by default which is perfect!)

## Step 5: Deploy!

1. Click "Deploy"
2. Wait 2-3 minutes
3. Watch the build logs (it should succeed!)
4. Get your live URL! 🎉

## Step 6: Verify Deployment

1. Visit your Vercel URL
2. Try logging in as admin
3. Test features

## Common Issues

### Build Fails - "Module not found"

**Solution**: Make sure all dependencies are in `package.json` (they are!)

### 500 Error on Login

**Solution**: Check environment variables in Vercel Dashboard:
- Settings > Environment Variables
- Make sure all 3 Supabase variables are set
- Redeploy after adding variables

### "Cannot find module '@monaco-editor/react'"

**Solution**: Monaco Editor is large. Vercel might timeout. This is normal for first build.
- Just wait 3-5 minutes
- If still failing, check build logs for specific errors

### TypeScript Errors

**Solution**: Vercel builds with strict TypeScript checks
- Check build logs in Vercel dashboard
- Fix any TS errors locally first
- Push and redeploy

## Post-Deployment Checklist

✅ Site loads
✅ Admin login works
✅ Student dashboard accessible
✅ Exams page loads
✅ Code execution works (run a coding question)
✅ No console errors

## Environment Variables Reference

### What Each Variable Does

| Variable | Where Used | Security |
|----------|------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-side | Public (safe) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side | Public (safe, RLS protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side only | **Secret** (never expose!) |

**Why `NEXT_PUBLIC_` prefix?**
- These variables are exposed to the browser
- They're safe because RLS (Row Level Security) protects your data
- Admin operations use service_role key on server only

## Updating Your Site

Every time you push to GitHub:
```bash
git add .
git commit -m "Your changes"
git push
```

Vercel automatically:
1. Detects the push
2. Triggers a new deployment
3. Builds and deploys your changes
4. Updates your live site (usually takes 2-3 minutes)

You can disable auto-deploy in Vercel dashboard if needed.

## Custom Domain (Optional)

1. In Vercel project > Settings > Domains
2. Add your custom domain
3. Follow DNS instructions
4. Wait for SSL certificate (automatic, usually 1-2 minutes)

## Monitoring & Logs

- **Deployments**: See all deployments in Vercel dashboard
- **Logs**: Click on any deployment to see build logs
- **Analytics**: Enable in Vercel dashboard (paid feature)
- **Errors**: Check browser console and Vercel logs

## Cost

**Free Tier Includes:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic SSL
- Edge Network (fast global CDN)
- Preview deployments for every push

**Paid Tiers** needed only for:
- High traffic (>100GB/month)
- More team members
- Advanced analytics

Your project should fit comfortably in the free tier! 🎉

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Get help: Vercel Discord or GitHub Discussions

## Quick Deploy Summary

```
1. Push to GitHub ✅
2. Go to vercel.com
3. Import repository
4. Add environment variables
5. Deploy
6. Done! 🚀
```

Good luck! Your MindCraft platform will be live in minutes! 🎊

