# Setup Guide for Daily Life Tracker

## 🚀 Quick Start (Supabase Development)

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd daily-life-tracker
npm install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env` and fill in the API keys:

```bash
cp .env.example .env
```

**Required Environment Variables:**

#### Database (Required - Supabase)
```env
# Connect to Supabase via connection pooling
DATABASE_URL="postgresql://postgres.project_ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations
DIRECT_URL="postgresql://postgres.project_ref:password@aws-0-region.pooler.supabase.com:5432/postgres"

# Supabase client configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

**To get your Supabase credentials:**
1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to **Settings** → **Database** to get your connection strings
3. Go to **Settings** → **API** to get your URL and anon key
4. Replace the values above with your actual credentials

#### Authentication (Required)
```env
NEXTAUTH_SECRET="generate-a-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```
Generate a secret: `openssl rand -base64 32`

#### Google OAuth (Required for Gmail login)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure consent screen if prompted
6. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy your Client ID and Client Secret
8. Add them to your `.env`:
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Google AI (Required for macro calculation)
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Add it to your `.env`:
```env
GOOGLE_AI_API_KEY="your-gemini-api-key"
```

#### Cloudinary (Required for image uploads)
1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your cloud name, API key, and API secret from the dashboard
3. Add them to your `.env`:
```env
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

#### Stripe (Required for subscriptions - NEW!)
1. **Create Stripe Account**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Create a new account or sign in
   - Switch to **Test Mode** for development

2. **Create Premium Product**:
   - Go to **Products** → **Create Product**
   - Product name: "Daily Life Tracker Premium"
   - Pricing model: "Recurring"
   - Price: $7.99 USD
   - Billing period: Monthly
   - Click **Create Product**
   - Copy the **Price ID** (starts with `price_`)

3. **Get API Keys**:
   - Go to **Developers** → **API keys**
   - Copy the **Publishable key** (starts with `pk_test_`)
   - Copy the **Secret key** (starts with `sk_test_`)

4. **Set Up Webhooks**:
   - Go to **Developers** → **Webhooks**
   - Click **Add endpoint**
   - Endpoint URL: `http://localhost:3000/api/stripe/webhook` (for local dev)
   - Select events to listen to:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Click **Add endpoint**
   - Copy the **Webhook signing secret** (starts with `whsec_`)

5. **Add to your `.env`**:
```env
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_secret_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
STRIPE_PREMIUM_PRICE_ID="price_your_price_id_here"
```

### 3. Set Up Database (Supabase)
```bash
npx prisma generate
npx prisma db push
```

The app uses **Supabase PostgreSQL** for all environments - no local database setup required! Your data is automatically backed up and scalable.

**Benefits of Supabase:**
- ✅ **Zero setup**: No local database installation needed
- ✅ **Production-ready**: Same database for development and production
- ✅ **Auto-scaling**: Handles traffic spikes automatically
- ✅ **Backups**: Automatic daily backups included
- ✅ **Real-time**: Built-in real-time capabilities for future features

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## 🎯 **You're Ready!**

The app is now running with:
- ✅ Supabase PostgreSQL database (cloud-hosted)
- ✅ Authentication system (email/password + Google OAuth)
- ✅ AI-powered macro calculation with image analysis
- ✅ Separate daily weight tracking system
- ✅ Image upload for food and health entries
- ✅ Full CRUD operations (create, read, update, delete)
- ✅ **Stripe subscription system with usage limits**
- ✅ **Admin panel for unlimited access**
- ✅ Modern UI components

**Next steps:**
1. Visit `http://localhost:3000`
2. Create an account at `/auth/signup` OR sign in with Google
3. Start with the free tier (20 AI calculations, 5 uploads/month)
4. Explore subscription features at `/subscription`
5. Grant unlimited access to yourself at `/admin` (if you're an admin)

---

## 💳 Subscription Features Overview

### Free Tier (Default)
- ✅ 20 AI macro calculations per month
- ✅ 5 image uploads per month
- ✅ All basic tracking features
- ✅ Daily summaries

### Premium Tier ($7.99/month)
- ✅ **Unlimited** AI macro calculations
- ✅ **Unlimited** image uploads
- ✅ Priority support
- ✅ Future premium features

### Admin Features
- ✅ Grant unlimited access to specific users
- ✅ Admin panel at `/admin`
- ✅ Override billing for friends/team members

### Usage Monitoring
- ✅ Real-time usage tracking
- ✅ Progressive warnings (80%, 100% usage)
- ✅ Contextual upgrade prompts
- ✅ Monthly usage reset

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your GitHub repository
3. Add all environment variables from your `.env` to Vercel
4. **Update Stripe for production:**
   - Switch Stripe to **Live Mode**
   - Update webhook endpoint to: `https://your-domain.vercel.app/api/stripe/webhook`
   - Copy new live API keys to Vercel environment variables
5. **Update Google OAuth for production:**
   - Go back to Google Cloud Console
   - Add production redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
6. Update `prisma/schema.prisma` to use PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
7. Deploy!

### Option 2: Self-Hosted
1. Build the application:
```bash
npm run build
```
2. Start the production server:
```bash
npm start
```

## 🗄️ Database Management

### View Data (Supabase Dashboard)
1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Table Editor** to view and edit data
3. Use **SQL Editor** for custom queries
4. **Alternative**: Use Prisma Studio locally:
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma db push --force-reset
```
⚠️ **Warning**: This will delete all data in your Supabase database!

### Database Configuration
The app is configured to use **Supabase PostgreSQL** with:
- **Connection pooling** for optimal performance (port 6543)
- **Direct connection** for migrations (port 5432)
- **SSL encryption** for secure connections
- **Automatic backups** handled by Supabase

### Switch Databases (if needed)
To use a different Supabase project:
1. Update connection strings in `.env` and `.env.local`:
   ```env
   DATABASE_URL="postgresql://postgres.new_project_ref:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.new_project_ref:password@aws-0-region.pooler.supabase.com:5432/postgres"
   NEXT_PUBLIC_SUPABASE_URL="https://new-project-ref.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="new-anon-key"
   ```
2. Run migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

## 🔧 Troubleshooting

### Common Issues

**"Module not found" errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors:**
```
```