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

### MVP Phase 1 (Current Progress)
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
- [ ] 🚧 Food tracking page implementation
- [ ] 🚧 Health tracking page implementation  
- [ ] 🚧 Dashboard with daily overview
- [ ] 🚧 Image upload functionality with Cloudinary
- [ ] 🚧 Weight tracking integration
- [ ] 🚧 Data editing capabilities

### Future Phases
- [ ] Physical activity tracking
- [ ] Sleep pattern monitoring
- [ ] Data correlation analysis
- [ ] Advanced visualizations
- [ ] Export capabilities

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- Google AI API key
- Cloudinary account (for image uploads)

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

# Required for image uploads
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
1. User logs in
2. Navigates to "Food Tracking"
3. Enters meal description and time
4. Optionally uploads photo
5. AI calculates macros automatically
6. User can edit/confirm macros
7. System prompts for daily weight if not entered
8. View daily summary with edit options

### Intestinal Health Flow
1. Navigate to "Health Tracking"
2. Log intestinal activity with details
3. Optional photo upload
4. View patterns and trends

## 🔒 Security Considerations
- Password hashing with bcrypt
- JWT token management via NextAuth.js
- Input validation with Zod
- Image upload size limits
- Rate limiting on API endpoints

## 📈 Data Correlation Strategy
- Store timestamped entries for all activities
- Implement correlation algorithms to find patterns
- Visualize relationships between diet and health metrics
- Export data for external analysis tools

## 🧪 Current Status
**✅ READY FOR DEVELOPMENT!**

The app foundation is complete and working with:
- ✅ Full authentication system
- ✅ Database models and APIs (SQLite working locally)
- ✅ Modern UI component library
- ✅ Type-safe client-server communication
- ✅ AI integration for macro calculation
- ✅ Local development environment ready

**Next steps**: 
1. Create food tracking pages (`/food`)
2. Create health monitoring pages (`/health`) 
3. Build dashboard with daily overview (`/dashboard`)
4. Add image upload functionality

**Get started**: Visit `http://localhost:3000` and create an account! 