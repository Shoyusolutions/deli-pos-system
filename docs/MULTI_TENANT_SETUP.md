# Multi-Tenant POS System Setup Guide

## Architecture: One App, Multiple Databases

### 1. Environment Configuration per Business

Each business gets its own `.env` file:

```bash
# For Deli
.env.deli
MONGODB_URI=mongodb+srv://user:pass@cluster/deli_pos_db
STORE_NAME="Bedstuy Deli & Grill"
STORE_ID="deli_001"

# For ACRO Coffee
.env.acro
MONGODB_URI=mongodb+srv://user:pass@cluster/acro_coffee_db
STORE_NAME="ACRO Coffee"
STORE_ID="acro_001"

# For New Client
.env.clientname
MONGODB_URI=mongodb+srv://user:pass@cluster/clientname_db
STORE_NAME="Client Business Name"
STORE_ID="client_001"
```

### 2. Database Structure per Business

Each business database contains:
- `products` - Their specific inventory
- `users` - Their staff accounts
- `transactions` - Their sales data
- `settings` - Their configuration
- `suppliers` - Their vendors

### 3. Deployment Options

#### Option A: Subdomain per Business (RECOMMENDED)
```
deli.yourposapp.com → Deli Database
acro.yourposapp.com → ACRO Database
client.yourposapp.com → Client Database
```

#### Option B: Single Domain with Store Selection
```
app.yourposapp.com/login
└── Select Store → Connect to specific database
```

### 4. Security Best Practices

1. **Separate MongoDB Users per Database**
   ```javascript
   // Each business gets unique credentials
   deli_user → Can only access deli_db
   acro_user → Can only access acro_db
   ```

2. **API Keys per Business**
   ```javascript
   // Each business gets unique API keys
   STRIPE_KEY_DELI=sk_live_deli_xxxxx
   STRIPE_KEY_ACRO=sk_live_acro_xxxxx
   ```

3. **Backup Strategy**
   - Independent backup schedules
   - Separate backup storage locations
   - Business-specific retention policies

### 5. Code Organization

```
/pos-system
  /apps
    /shared         # Shared POS components
    /deli          # Deli-specific customizations
    /acro          # ACRO-specific customizations
  /packages
    /ui            # Shared UI components
    /database      # Database schemas
    /utils         # Shared utilities
```

### 6. Environment Switching

Create a script to switch between businesses:

```bash
#!/bin/bash
# switch-store.sh

case "$1" in
  deli)
    cp .env.deli .env.local
    echo "Switched to Deli POS"
    ;;
  acro)
    cp .env.acro .env.local
    echo "Switched to ACRO Coffee"
    ;;
  *)
    echo "Usage: ./switch-store.sh [deli|acro|clientname]"
    ;;
esac
```

### 7. Advantages of This Approach

✅ **Complete Data Isolation** - No risk of mixing business data
✅ **Independent Scaling** - Each DB scales based on business needs
✅ **Custom Pricing Plans** - Bill each business separately
✅ **Easy Onboarding** - New client = New database + Config
✅ **Simple Maintenance** - Update one codebase, deploy to all
✅ **Compliance Ready** - Data sovereignty per business

### 8. Migration Path

For existing setup:
1. Keep `deli_pos_system` database for Deli
2. Create new `acro_coffee_system` database for ACRO
3. Migrate ACRO products to new database
4. Update connection strings

### 9. Monitoring & Analytics

Use MongoDB Atlas features:
- Performance monitoring per database
- Alerts per business
- Usage metrics for billing
- Separate audit logs

### 10. Sample Implementation

```javascript
// config/database.js
const getDbConfig = () => {
  const storeId = process.env.STORE_ID;

  return {
    uri: process.env.MONGODB_URI,
    dbName: `${storeId}_db`,
    options: {
      // Connection options
    }
  };
};

// middleware/storeContext.js
export const storeContext = (req, res, next) => {
  req.storeId = process.env.STORE_ID;
  req.storeName = process.env.STORE_NAME;
  next();
};
```

## Quick Start for New Client

1. **Create Database**
   ```bash
   mongosh "mongodb+srv://cluster.mongodb.net"
   use newclient_pos_db
   ```

2. **Create MongoDB User**
   ```javascript
   db.createUser({
     user: "newclient_user",
     pwd: "secure_password",
     roles: [{role: "readWrite", db: "newclient_pos_db"}]
   })
   ```

3. **Setup Environment**
   ```bash
   cp .env.template .env.newclient
   # Edit with client-specific values
   ```

4. **Initialize Database**
   ```bash
   STORE_ID=newclient npm run seed:initial
   ```

5. **Deploy**
   ```bash
   npm run deploy:newclient
   ```

## Cost Estimation

Per Business Monthly:
- MongoDB Atlas Shared: $0-9/month
- MongoDB Atlas Dedicated: $57+/month
- Vercel Hosting: $20/month (all clients)
- Total per client: ~$10-60/month

## Security Checklist

- [ ] Unique database per business
- [ ] Separate MongoDB users
- [ ] Different API keys per business
- [ ] SSL/TLS encryption
- [ ] Regular security audits
- [ ] GDPR/Privacy compliance
- [ ] Separate backup policies
- [ ] Access logging per business