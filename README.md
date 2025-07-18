# Daily Life Tracker

A modern web application for tracking daily health metrics including nutrition, intestinal health, physical activity, and sleep patterns.

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes with tRPC for type-safe APIs
- **Database**: SQLite (local development) / PostgreSQL (production)
- **Authentication**: NextAuth.js with credentials provider
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
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Data Models

### User
- id, email, password_hash, name, created_at, updated_at

### MacroEntry
- id, user_id, description, image_url?, hour, date, calculated_macros (JSON), weight?, created_at, updated_at

### IntestinalEntry
- id, user_id, date, hour, consistency, color, pain_level, notes?, image_url?, created_at, updated_at

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
- [x] ✅ **Weight tracking integration**
- [x] ✅ **Real-time data updates and daily summaries**

### Phase 2 (Next Steps)
- [ ] 🚧 Image upload functionality with Cloudinary
- [ ] 🚧 Data editing capabilities (edit/delete entries)
- [ ] 🚧 Data visualization and trends
- [ ] 🚧 Weekly/monthly summaries

### Future Phases
- [ ] Physical activity tracking
- [ ] Sleep pattern monitoring
- [ ] Data correlation analysis
- [ ] Advanced visualizations
- [ ] Export capabilities

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Google AI API key (for macro calculation)
- Cloudinary account (for future image uploads)

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
# Required for AI features
GOOGLE_AI_API_KEY="your-gemini-api-key"

# Required for auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# Required for image uploads (future feature)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

## 🌐 Deployment

### Local Development
- Uses SQLite database (no external database required)
- All data stored in `prisma/dev.db`

### Production Deployment
- Switch to PostgreSQL in `prisma/schema.prisma`
- Deploy to Vercel with Supabase database

## 📱 User Flow

### Macro Tracking Flow
1. User logs in → redirected to dashboard
2. Clicks "Add New Meal" on dashboard or navigates to `/food`
3. Enters meal description and time, optionally adds weight
4. AI calculates macros automatically using Google Gemini
5. User can view daily summary with macro totals
6. Recent meals shown with calculated nutrition info

### Intestinal Health Flow
1. Navigate to "Health Monitoring" from dashboard or `/health`
2. Log intestinal activity using Bristol Stool Scale
3. Add color, pain level (0-10), and optional notes
4. View daily summary with average pain level
5. Track patterns and individual entries with visual indicators

### Dashboard Overview
- Daily stats: calories consumed, meals logged, health entries, current weight
- Quick action buttons for adding new entries
- Recent activity from both food and health tracking
- Personalized welcome with today's date

## 🔒 Security Considerations
- Password hashing with bcrypt
- JWT token management via NextAuth.js
- Input validation with Zod
- Protected routes requiring authentication
- Rate limiting on API endpoints

## 📈 Data Correlation Strategy
- Store timestamped entries for all activities
- Implement correlation algorithms to find patterns
- Visualize relationships between diet and health metrics
- Export data for external analysis tools

## 🧪 Current Status
**🎉 MVP COMPLETE AND WORKING!**

The app is fully functional with:
- ✅ Complete authentication system
- ✅ Working dashboard with daily overview
- ✅ Food tracking with AI-powered macro calculation
- ✅ Health monitoring with Bristol Stool Scale
- ✅ SQLite database storing all data locally
- ✅ Modern, responsive UI
- ✅ Type-safe end-to-end communication
- ✅ Real-time data updates

**Ready for production use!** 🚀

### What You Can Do Right Now:
1. **Sign up** at `/auth/signup`
2. **Sign in** at `/auth/signin`
3. **Track meals** with automatic macro calculation
4. **Monitor health** using medical-grade Bristol Stool Scale
5. **View daily summaries** on the dashboard
6. **Track weight** with meal entries

**Next phase**: Add image uploads, data editing, and advanced analytics! 