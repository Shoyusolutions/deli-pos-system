# 🚨 URGENT: Update Production Environment Variables

Your production deployments are still using the OLD INSECURE database credentials!

## For Vercel Deployments:

### Option 1: Using Vercel CLI (Recommended)

```bash
# For Deli POS
cd /Users/franklinreitzas/deli_pos_system
vercel env pull  # Download current env
vercel env add MONGODB_URI production
# Enter: mongodb+srv://deli_secure_user:RvKJ1Q&tPBx9ln9RhciEactk@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos

# For ACRO Coffee
cd /Users/franklinreitzas/acro_coffee_pos
vercel env add MONGODB_URI production
# Enter: mongodb+srv://acro_secure_user:XarpAIoF3rM!fJckW4GDxO9P@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority&appName=ACRO-Coffee
```

### Option 2: Using Vercel Dashboard (Easier)

1. **Go to:** https://vercel.com/dashboard
2. **Select your project** (deli-pos-system or acro-coffee-pos)
3. **Click:** Settings → Environment Variables
4. **Find:** MONGODB_URI
5. **Update with new secure connection string:**

#### For Deli POS:
```
MONGODB_URI = mongodb+srv://deli_secure_user:RvKJ1Q&tPBx9ln9RhciEactk@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos
```

#### For ACRO Coffee:
```
MONGODB_URI = mongodb+srv://acro_secure_user:XarpAIoF3rM!fJckW4GDxO9P@deli-pos.mamcjur.mongodb.net/acro_coffee_pos?retryWrites=true&w=majority&appName=ACRO-Coffee
```

6. **Click:** Save
7. **IMPORTANT:** Redeploy for changes to take effect!

## Also Update These Variables:

### Security Keys (Generate new ones):
```
NEXTAUTH_SECRET = [generate new 32+ character random string]
JWT_SECRET = [generate new 32+ character random string]
```

### Remove or Change:
```
DEFAULT_OWNER_PASSWORD = [change from default]
DEFAULT_CASHIER_PASSWORD = [change from default]
ADMIN_OVERRIDE_PASSWORD = [remove in production]
```

## After Updating:

1. **Trigger new deployment:**
```bash
vercel --prod  # Redeploy with new env vars
```

2. **Test production sites**
3. **Monitor for any connection errors**

## ⚠️ CRITICAL:

**Your production sites are vulnerable until you update these!**
The old `delipos_user` credentials no longer work, so your production sites might be broken right now!

## Production URLs to Test:
- Deli POS: https://[your-deli-app].vercel.app
- ACRO Coffee: https://[your-acro-app].vercel.app