# Deli POS System - Vercel Environment Variables

## Copy ALL of this and paste into Vercel's bulk import:

```
MONGODB_URI=mongodb+srv://deli_secure_user:RvKJ1Q&tPBx9ln9RhciEactk@deli-pos.mamcjur.mongodb.net/deli_pos_system?retryWrites=true&w=majority&appName=Deli-Pos
NEXTAUTH_SECRET=QxESuwiAUlG5Wy7EBN9SfMHCIkONZoG0GqQ1vvaHQ6w=
NEXTAUTH_URL=https://deli-pos-system.vercel.app
JWT_SECRET=56450854b09a2681d1ad03fff5435e138d297e562a92a04055927f4c98449d90
NODE_ENV=production
STORE_ID=68cd95c09876bc8663a80f84
STORE_NAME=Bedstuy Deli & Grill
ADMIN_OVERRIDE_PASSWORD=ChangeThisSecurePassword2024!
DEFAULT_OWNER_EMAIL=owner@bedstuydeli.com
DEFAULT_OWNER_PASSWORD=ChangeThis123!
DEFAULT_CASHIER_EMAIL=cashier1@bedstuydeli.com
DEFAULT_CASHIER_PASSWORD=ChangeThis456!
EANDB_JWT=eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI5NjlkZjM5Ny1hNjEwLTQyOGMtYTNmMC1iZWVlZjEyMTc5ZWMiLCJpc3MiOiJjb20uZWFuLWRiIiwiaWF0IjoxNzU4MzQxNjYxLCJleHAiOjE3ODk4Nzc2NjEsImlzQXBpIjoidHJ1ZSJ9.g4uZNmJBpfOKbDLFGOJWdC_J-Wgmzz0AMQtGMPKD7KpkB68eN5iUTg0MSDbQMNiu1ZKNeOdExBGgPWuogre1Zw
EANDB_API_URL=https://ean-db.com/api/v2
```

## How to use:
1. Copy everything between the ``` marks above
2. In Vercel, go to your Deli POS project → Settings → Environment Variables
3. Clear all existing variables (if updating)
4. Look for "paste the .env contents" option or bulk import
5. Paste everything
6. Save and redeploy

## ⚠️ CRITICAL:
The MONGODB_URI uses `deli_secure_user` which can ONLY access `deli_pos_system` database - completely isolated from ACRO Coffee!