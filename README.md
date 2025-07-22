# Daily Life Tracker

A modern web application for tracking daily health metrics including nutrition, intestinal health, physical activity, and sleep patterns. Now with **Premium Subscription** powered by Stripe!

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with tRPC for type-safe APIs
- **Database**: Supabase PostgreSQL (cloud-hosted for both development and production)
- **Authentication**: NextAuth.js with credentials provider + Google OAuth
- **File Storage**: Cloudinary for image uploads
- **AI Integration**: Google Gemini 2.5-flash for macro calculation
- **Payments**: Stripe for subscription management
- **Deployment**: Vercel (free tier)

### Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Next.js)     │◄──►│   (tRPC/Next.js) │◄──►│ (Supabase PgSQL)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Storage  │    │   AI Service     │    │   Payments      │
│   (Cloudinary)  │    │   (Gemini)       │    │   (Stripe)      │
│   + OAuth       │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Models

### User
- id, email, password_hash, name, created_at, updated_at
- **New**: subscription_status, customer_id, subscription_id, trial_end_date, monthly_ai_usage, monthly_uploads, is_unlimited

### MacroEntry
- id, user_id, description, image_url?, hour, date, calculated_macros (JSON), created_at, updated_at

### IntestinalEntry
- id, user_id, date, hour, consistency, color, pain_level, notes?, image_url?, created_at, updated_at

### WeightEntry
- id, user_id, date, weight, created_at, updated_at
- **Unique constraint**: One weight entry per user per day

## 💳 Subscription System

### Free Tier
- ✅ 20 AI macro calculations per month
- ✅ 5 image uploads per month
- ✅ All basic tracking features
- ✅ Daily summaries and trends

### Premium Tier ($7.99/month)
- ✅ **Unlimited** AI macro calculations
- ✅ **Unlimited** image uploads
- ✅ Priority support
- ✅ Future premium features
- ✅ Advanced analytics (coming soon)

### Admin Features
- 🔧 Grant unlimited access to specific users
- 🔧 Admin panel at `/admin`
- 🔧 Usage monitoring and management

## 🚀 Features

### MVP Phase 1 (✅ COMPLETE!)
- [x] ✅ Project setup with Next.js 14, TypeScript, Tailwind CSS
- [x] ✅ Database schema with Prisma ORM (SQLite for local dev)
- [x] ✅ tRPC setup for type-safe APIs
- [x] ✅ NextAuth.js authentication system
- [x] ✅ User registration and sign-in pages
- [x] ✅ Basic UI components (Button, Input, Card, etc.)
- [x] ✅ Home page with navigation
- [x] ✅ Auth router with user registration
- [x] ✅ Macro tracking router with AI integration
- [x] ✅ Intestinal health tracking router
- [x] ✅ **Working local development environment**
- [x] ✅ **Dashboard with daily overview**
- [x] ✅ **Food tracking page with AI macro calculation**
- [x] ✅ **Health tracking page with Bristol Stool Scale**
- [x] ✅ **Real-time data updates and daily summaries**
- [x] ✅ **Image upload functionality with Cloudinary**

### Phase 2 (✅ COMPLETE!)
- [x] ✅ Image upload functionality with Cloudinary (file system + camera)
- [x] ✅ **Google OAuth integration for Gmail login**
- [x] ✅ **Separate daily weight tracking system**
- [x] ✅ **Data editing capabilities (edit/delete entries)**
- [x] ✅ **Enhanced AI macro calculation with image analysis**
- [x] ✅ **Weight prompt system for daily tracking**

### Phase 3 (✅ COMPLETE!)
- [x] ✅ **Stripe subscription system with usage-based limits**
- [x] ✅ **Usage tracking and warnings**
- [x] ✅ **Admin panel for granting unlimited access**
- [x] ✅ **Subscription management page**
- [x] ✅ **Automated billing with webhooks**
- [x] ✅ **Smart usage limiting for AI and uploads**
- [x] ✅ **Smart calorie balance tracking**
- [x] ✅ **Physical activity tracking**

### Phase 4 (Future)
- [ ] 🚧 Data visualization and trends with charts
- [ ] 🚧 Weekly/monthly summaries and analytics
- [ ] 🚧 Sleep pattern monitoring
- [ ] 🚧 Data correlation analysis
- [ ] 🚧 Advanced visualizations
- [ ] 🚧 Export capabilities

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Google AI API key (for macro calculation)
- Cloudinary account (for image uploads)
- Google OAuth credentials (for Gmail login)
- **Stripe account (for payments)**

### Quick Start
```bash
# 1. Clone and install
git clone <repository-url>
cd daily-life-tracker
npm install

# 2. Set up environment (copy .env.example to .env and fill in API keys)
cp .env.example .env

# 3. Set up database
npx prisma generate
npx prisma db push

# 4. Start development server
npm run dev
```

Visit `http://localhost:3000` to see your app!

### Environment Variables
```env
# Required for database
DATABASE_URL="file:./dev.db"  # SQLite for local dev

# Required for auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Required for Google OAuth (Gmail login)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Required for AI features
GOOGLE_AI_API_KEY="your-gemini-api-key"

# Required for image uploads
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Required for payments (NEW!)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_PREMIUM_PRICE_ID="price_..."  # Create this in Stripe Dashboard
```

### Setting Up Stripe (New!)

1. **Create Stripe Account**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com/)
   - Create a new account or sign in
   - Switch to test mode for development

2. **Create Premium Product**:
   - Go to Products → Create Product
   - Name: "Daily Life Tracker Premium"
   - Create a recurring price: $7.99/month
   - Copy the price ID to `STRIPE_PREMIUM_PRICE_ID`

3. **Get API Keys**:
   - Go to Developers → API keys
   - Copy "Publishable key" to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy "Secret key" to `STRIPE_SECRET_KEY`

4. **Set Up Webhooks**:
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/stripe/webhook`
   - Select events: `customer.subscription.*`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

5. **Local Development with Stripe CLI**:
   ```bash
   # Install Stripe CLI (Linux/Ubuntu)
   curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
   echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
   sudo apt update && sudo apt install stripe
   
   # Login to Stripe CLI
   stripe login
   
   # Get local webhook secret for development
   stripe listen --print-secret
   # Copy the output (whsec_...) to STRIPE_WEBHOOK_SECRET in your .env
   
   # Start webhook forwarding (run in separate terminal)
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   
   # Start your development server (run in another terminal)
   npm run dev
   
   # Test webhook events
   stripe trigger invoice.payment_succeeded
   stripe trigger customer.subscription.created
   ```

6. **Configure Customer Portal**:
   - Go to Settings → Billing → Customer Portal
   - Configure what customers can do (cancel, update payment, etc.)
   - Save configuration to enable "Manage Subscription" button

### Setting Up Google OAuth

1. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URLs: `http://localhost:3000/api/auth/callback/google`

2. **Add credentials to `.env`**:
   ```env
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

## 🌐 Deployment

### Local Development

**Current Status**: The app runs entirely on **Supabase PostgreSQL** for all environments (development, staging, production). This ensures consistency across all deployment stages.

#### Database
- **All data stored in Supabase PostgreSQL** (cloud-hosted)
- **Connection pooling** for optimal performance
- **Automatic backups** and scaling handled by Supabase
- **Real-time capabilities** available for future features

### Production Deployment
- **Database**: Already on Supabase PostgreSQL (no migration needed)
- Deploy to Vercel with existing Supabase database
- Update Google OAuth redirect URLs for production domain
- **Update Stripe webhook endpoint to production URL**

## 📱 User Experience

### Authentication Flow
- **Email/Password**: Traditional registration and login
- **Google OAuth**: One-click sign-in with Gmail account
- **Unified Experience**: Same dashboard regardless of sign-in method
- **Smart Redirects**: Automatic dashboard redirect for authenticated users

### Subscription Flow (New!)
1. **Free Trial**: Users start with free tier (20 AI calculations, 5 uploads/month)
2. **Usage Warnings**: Smart notifications when approaching limits
3. **Upgrade Prompts**: Contextual upgrade suggestions
4. **Seamless Billing**: Stripe handles all payment processing
5. **Admin Override**: Unlimited access can be granted manually

### Weight Tracking Flow
1. **Daily Prompt**: New users prompted to enter weight on dashboard
2. **Smart Display**: Shows today's weight or latest weight with date
3. **Easy Access**: "Add today's weight" button always available
4. **One Per Day**: Database constraint ensures single weight per date

### Macro Tracking Flow
1. User logs in → redirected to dashboard
2. Clicks "Add New Meal" on dashboard or navigates to `/food`
3. **Usage Check**: System verifies AI calculation limit (new!)
4. Enters meal description and time, optionally adds photo
5. AI calculates macros automatically using Google Gemini (enhanced with image analysis)
6. **Usage Increment**: System tracks AI usage for billing (new!)
7. User can edit/delete entries with full form modal
8. User can view daily summary with macro totals
9. Recent meals shown with calculated nutrition info and thumbnails

### Intestinal Health Flow
1. Navigate to "Health Monitoring" from dashboard or `/health`
2. Log intestinal activity using Bristol Stool Scale
3. **Upload Check**: System verifies image upload limit (new!)
4. Add color, pain level (0-10), optional notes, and photos
5. User can edit/delete entries with full form modal
6. View daily summary with average pain level
7. Track patterns and individual entries with visual indicators

### Dashboard Overview
- **Daily stats**: calories consumed, meals logged, health entries, current weight
- **Subscription Badge**: Shows current plan (Free/Premium) (new!)
- **Usage Warnings**: Progress bars and warnings for limits (new!)
- **Upgrade Prompts**: Smart contextual upgrade suggestions (new!)
- **Weight management**: Smart weight display with prompts for missing data
- **Quick action buttons** for adding new entries
- **Recent activity** from both food and health tracking with image thumbnails
- **Enhanced macro display** showing all macronutrients in recent meals
- **Personalized welcome** with today's date

## 🔒 Security Considerations
- Password hashing with bcrypt
- JWT token management via NextAuth.js
- Google OAuth integration with secure token handling
- **Stripe webhook signature verification** (new!)
- Input validation with Zod
- Protected routes requiring authentication
- **Usage-based rate limiting** (new!)
- User data isolation (users can only access their own data)
- **Admin role protection** (new!)

## 📈 Data Architecture

### Subscription Management (New!)
- **Usage Tracking**: Monthly AI and upload counters with automatic reset
- **Flexible Limits**: Different limits for free vs premium users
- **Admin Override**: `isUnlimited` flag for manual unlimited access
- **Webhook Integration**: Real-time subscription status updates from Stripe
- **Graceful Degradation**: Features remain accessible, just with limits

### Weight Tracking
- **Decoupled Design**: Weight separate from meal entries
- **Daily Constraint**: One weight entry per user per day
- **Smart Fallbacks**: Shows latest weight when today's unavailable
- **User Prompts**: Automatic prompting for missing daily weight

### Image Management
- **Cloudinary Integration**: Automatic optimization and CDN delivery
- **Multiple Sources**: File upload or camera capture
- **AI Enhancement**: Images used for better macro calculation accuracy
- **Secure Storage**: Images linked to user entries with proper access control
- **Usage Tracking**: Upload counts tracked for billing (new!)

### Data Editing
- **Full CRUD Operations**: Create, read, update, delete for all entries
- **Smart AI Recalculation**: Macros recalculated only when description/image changes
- **Usage-Aware**: AI recalculation respects usage limits (new!)
- **Optimistic Updates**: UI updates immediately for better UX
- **Confirmation Dialogs**: Prevents accidental deletions

## 🧪 Current Status
**🎉 PRODUCTION READY WITH MONETIZATION!**

The app is fully functional with:
- ✅ Complete authentication system (email + Google OAuth)
- ✅ **Stripe subscription system with usage-based billing**
- ✅ **Smart usage tracking and limiting**
- ✅ **Admin panel for user management**
- ✅ Working dashboard with daily overview and weight tracking
- ✅ Food tracking with AI-powered macro calculation and image analysis
- ✅ Health monitoring with Bristol Stool Scale and photo documentation
- ✅ Image upload for both food and health entries (file system + camera)
- ✅ Enhanced AI macro calculation using food images
- ✅ Separate daily weight tracking system with smart prompts
- ✅ Full data editing capabilities (edit/delete all entries)
- ✅ Supabase database storing all data locally
- ✅ Modern, responsive UI with consistent design
- ✅ Type-safe end-to-end communication
- ✅ Real-time data updates and comprehensive error handling

**Ready for monetization and production use!** 🚀💰

### What You Can Do Right Now:
1. **Sign up** with email at `/auth/signup` OR **sign in with Google**
2. **Start with free tier** (20 AI calculations, 5 uploads/month)
3. **Track daily weight** with automatic prompting and smart display
4. **Track meals** with AI-powered macro calculation
5. **Upload food photos** from device or camera for better macro accuracy
6. **Monitor usage** on the subscription page
7. **Upgrade to premium** for unlimited access
8. **Edit/delete any entry** with full-featured modal forms
9. **Monitor health** using medical-grade Bristol Stool Scale
10. **Add health photos** for comprehensive documentation
11. **View daily summaries** on the dashboard with complete macro breakdowns
12. **Experience seamless UX** with usage warnings and upgrade prompts

### Admin Features:
- **Grant unlimited access** to friends/team members at `/admin`
- **Monitor user subscriptions** and usage patterns
- **Override billing limits** for special users

**Next phase**: Add data visualization, weekly/monthly analytics, and correlation analysis! 🚀

## 💡 Business Model

### Revenue Streams
- **Premium Subscriptions**: $7.99/month for unlimited access
- **Freemium Model**: Generous free tier to attract users
- **Admin Overrides**: Free unlimited access for team/friends

### Usage Limits (Designed for Conversion)
- **Free Tier**: 20 AI calculations + 5 uploads/month
- **Strategic Limiting**: Limits hit after ~1 week of active use
- **Smart Notifications**: Progressive warnings at 80% and 100% usage
- **Contextual Upgrades**: Upgrade prompts when limits are reached

### Cost Management
- **AI Costs**: Google Gemini API usage tracked and limited
- **Storage Costs**: Cloudinary uploads tracked and limited
- **Scalable Infrastructure**: Usage-based pricing aligns costs with revenue 

## 🏃‍♂️ Activity Tracking & Calorie Balance

Track your physical activities and monitor your daily calorie balance with these new features:

### Activity Logging
- Log various types of physical activities (running, cycling, weight training, etc.)
- Record duration, intensity, and description for each activity
- Add optional notes for more context
- Automatic calorie burn calculation based on:
  - Activity type
  - Duration
  - Intensity
  - Your current weight
- Manual calorie input support from fitness trackers/watches
- Edit or delete logged activities

### Smart Calorie Balance
- Real-time daily calorie balance tracking
- Combines food intake with:
  - BMR (Basal Metabolic Rate)
  - TDEE (Total Daily Energy Expenditure)
  - Activity calories burned
- Clear deficit/surplus indicators
- Automatic BMR calculation using:
  - Weight
  - Height
  - Age
  - Gender
  - Activity level

### Activity Types Supported
- Weight Training
- Running
- Cycling
- Swimming
- Walking
- Yoga
- Tennis
- Basketball
- Soccer
- Dancing
- Hiking
- Boxing
- Climbing
- Other (custom activities)

Each activity type has specific calorie burn rates calibrated for different intensity levels (low, moderate, high) and adjusted for your body weight. 