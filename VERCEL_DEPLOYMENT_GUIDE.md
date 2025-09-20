# Vercel Deployment Guide 🚀

## Your Repository
✅ **GitHub Repository Created**: https://github.com/Shoyusolutions/deli-pos-system

## Current Status
⚠️ **Deployment Failed**: Missing environment variables

## Steps to Complete Deployment

### 1. Set Up MongoDB Atlas (if not already done)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create a database user with a strong password
4. Add IP Address `0.0.0.0/0` to the Network Access list (allows connections from anywhere)
5. Get your connection string:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user's password
   - Add `/deli_pos` as the database name before the `?` in the connection string

Example connection string:
```
mongodb+srv://username:password@cluster.mongodb.net/deli_pos?retryWrites=true&w=majority
```

### 2. Generate NEXTAUTH_SECRET
Run this command in your terminal:
```bash
openssl rand -base64 32
```
Copy the output - this will be your NEXTAUTH_SECRET

### 3. Add Environment Variables to Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `deli_pos_system`
3. Go to "Settings" tab
4. Click on "Environment Variables" in the left sidebar
5. Add these variables:

| Variable Name | Value | Environment |
|--------------|-------|------------|
| MONGODB_URI | `mongodb+srv://...` (your connection string) | Production, Preview, Development |
| NEXTAUTH_SECRET | (output from openssl command) | Production, Preview, Development |
| NEXTAUTH_URL | `https://deli-pos-system.vercel.app` | Production |
| NODE_ENV | `production` | Production |

#### Option B: Via Vercel CLI
```bash
vercel env add MONGODB_URI
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add NODE_ENV
```

### 4. Redeploy the Application

After adding environment variables:

#### Via Dashboard:
1. Go to your project in Vercel Dashboard
2. Go to "Deployments" tab
3. Click the three dots on the latest deployment
4. Select "Redeploy"

#### Via CLI:
```bash
vercel --prod
```

### 5. Set Up Your Custom Domain (Optional)

1. In Vercel Dashboard, go to your project
2. Go to "Settings" → "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

### 6. Initial Setup After Deployment

Once deployed successfully:

1. **Seed the Database** (run these locally with your MongoDB URI):
```bash
# Set your MongoDB URI locally
export MONGODB_URI="your_mongodb_connection_string"

# Run seed scripts
npm run seed:users
npm run seed:store
```

2. **Default Login Credentials**:
- Email: `owner@bedstuydeli.com`
- Password: `bedstuy123`

### 7. Test Your Deployment

1. Visit your deployment URL
2. Try logging in with the default credentials
3. Test key features:
   - Store selection
   - Inventory management
   - Checkout process
   - Reports generation

## Troubleshooting

### If deployment still fails:
1. Check build logs: `vercel logs`
2. Verify environment variables are set: `vercel env ls`
3. Ensure MongoDB connection string is correct
4. Check that IP whitelist includes `0.0.0.0/0`

### Common Issues:
- **MongoDB connection fails**: Check IP whitelist and connection string
- **Authentication fails**: Verify NEXTAUTH_SECRET is set correctly
- **Build fails**: Check for TypeScript errors with `npm run build` locally

## Your Current Deployment URLs

- **Preview**: https://delipossystem-ejqzptduu-franklins-projects-0132eae7.vercel.app
- **Production**: Will be available after successful deployment

## Next Steps

1. ✅ Set up MongoDB Atlas
2. ✅ Add environment variables in Vercel Dashboard
3. ✅ Redeploy the application
4. ✅ Test the deployment
5. ✅ Configure custom domain (optional)

## Support

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **GitHub Repo**: https://github.com/Shoyusolutions/deli-pos-system

---

**Last Updated**: September 20, 2025