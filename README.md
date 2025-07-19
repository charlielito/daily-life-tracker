# Daily Life Tracker

A modern web application for tracking daily health metrics including nutrition, intestinal health, physical activity, and sleep patterns.

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with tRPC for type-safe APIs
- **Database**: SQLite (local development) / PostgreSQL (production)
- **Authentication**: NextAuth.js with credentials provider + Google OAuth
- **File Storage**: Cloudinary for image uploads
- **AI Integration**: Google Gemini 2.5-flash for macro calculation
- **Deployment**: Vercel (free tier)
- **Infrastructure**: Supabase for PostgreSQL hosting (free tier)

### Architecture Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (Next.js)     │◄──►│   (tRPC/Next.js) │◄──►│ (SQLite/PgSQL)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Storage  │    │   AI Service     │    │   Auth Service  │
│   (Cloudinary)  │    │   (Gemini)       │    │   (NextAuth.js) │
│   + OAuth       │    │                  │    │   + Google      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Models

### User
- id, email, password_hash, name, created_at, updated_at

### MacroEntry
- id, user_id, description, image_url?, hour, date, calculated_macros (JSON), created_at, updated_at

### IntestinalEntry
- id, user_id, date, hour, consistency, color, pain_level, notes?, image_url?, created_at, updated_at

### WeightEntry
- id, user_id, date, weight, created_at, updated_at
- **Unique constraint**: One weight entry per user per day

### Future Models
- PhysicalActivity, SleepEntry, CorrelationAnalysis

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

### Phase 3 (Future)
- [ ] 🚧 Data visualization and trends with charts
- [ ] 🚧 Weekly/monthly summaries and analytics
- [ ] 🚧 Physical activity tracking
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
```

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
- Uses SQLite database (no external database required)
- All data stored in `prisma/dev.db`

### Production Deployment
- Switch to PostgreSQL in `prisma/schema.prisma`
- Deploy to Vercel with Supabase database
- Update Google OAuth redirect URLs for production domain

## 📱 User Experience

### Authentication Flow
- **Email/Password**: Traditional registration and login
- **Google OAuth**: One-click sign-in with Gmail account
- **Unified Experience**: Same dashboard regardless of sign-in method
- **Smart Redirects**: Automatic dashboard redirect for authenticated users

### Weight Tracking Flow
1. **Daily Prompt**: New users prompted to enter weight on dashboard
2. **Smart Display**: Shows today's weight or latest weight with date
3. **Easy Access**: "Add today's weight" button always available
4. **One Per Day**: Database constraint ensures single weight per date

### Macro Tracking Flow
1. User logs in → redirected to dashboard
2. Clicks "Add New Meal" on dashboard or navigates to `/food`
3. Enters meal description and time, optionally adds photo
4. AI calculates macros automatically using Google Gemini (enhanced with image analysis)
5. User can edit/delete entries with full form modal
6. User can view daily summary with macro totals
7. Recent meals shown with calculated nutrition info and thumbnails

### Intestinal Health Flow
1. Navigate to "Health Monitoring" from dashboard or `/health`
2. Log intestinal activity using Bristol Stool Scale
3. Add color, pain level (0-10), optional notes, and photos
4. User can edit/delete entries with full form modal
5. View daily summary with average pain level
6. Track patterns and individual entries with visual indicators

### Dashboard Overview
- **Daily stats**: calories consumed, meals logged, health entries, current weight
- **Weight management**: Smart weight display with prompts for missing data
- **Quick action buttons** for adding new entries
- **Recent activity** from both food and health tracking with image thumbnails
- **Enhanced macro display** showing all macronutrients in recent meals
- **Personalized welcome** with today's date

## 🔒 Security Considerations
- Password hashing with bcrypt
- JWT token management via NextAuth.js
- Google OAuth integration with secure token handling
- Input validation with Zod
- Protected routes requiring authentication
- Rate limiting on API endpoints
- User data isolation (users can only access their own data)

## 📈 Data Architecture

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

### Data Editing
- **Full CRUD Operations**: Create, read, update, delete for all entries
- **Smart AI Recalculation**: Macros recalculated only when description/image changes
- **Optimistic Updates**: UI updates immediately for better UX
- **Confirmation Dialogs**: Prevents accidental deletions

## 🧪 Current Status
**🎉 PRODUCTION READY!**

The app is fully functional with:
- ✅ Complete authentication system (email + Google OAuth)
- ✅ Working dashboard with daily overview and weight tracking
- ✅ Food tracking with AI-powered macro calculation and image analysis
- ✅ Health monitoring with Bristol Stool Scale and photo documentation
- ✅ Image upload for both food and health entries (file system + camera)
- ✅ Enhanced AI macro calculation using food images
- ✅ Separate daily weight tracking system with smart prompts
- ✅ Full data editing capabilities (edit/delete all entries)
- ✅ SQLite database storing all data locally
- ✅ Modern, responsive UI with consistent design
- ✅ Type-safe end-to-end communication
- ✅ Real-time data updates and comprehensive error handling

**Ready for production use!** 🚀

### What You Can Do Right Now:
1. **Sign up** with email at `/auth/signup` OR **sign in with Google**
2. **Sign in** at `/auth/signin` with multiple authentication options
3. **Track daily weight** with automatic prompting and smart display
4. **Track meals** with automatic macro calculation
5. **Upload food photos** from device or camera for better macro accuracy
6. **Edit/delete any entry** with full-featured modal forms
7. **Monitor health** using medical-grade Bristol Stool Scale
8. **Add health photos** for comprehensive documentation
9. **View daily summaries** on the dashboard with complete macro breakdowns
10. **Experience seamless UX** with optimistic updates and error handling

**Next phase**: Add data visualization, weekly/monthly analytics, and correlation analysis! 🚀 