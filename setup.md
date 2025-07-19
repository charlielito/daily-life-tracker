# Setup Guide for Daily Life Tracker

## 🚀 Quick Start (Local Development)

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

#### Database (Required)
```env
DATABASE_URL="file:./dev.db"  # SQLite for local development
```

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

### 3. Set Up Database (Automatic - SQLite)
```bash
npx prisma generate
npx prisma db push
```

The app uses SQLite for local development - no external database setup required!

### 4. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see your app!

## 🎯 **You're Ready!**

The app is now running with:
- ✅ SQLite database (stored in `prisma/dev.db`)
- ✅ Authentication system (email/password + Google OAuth)
- ✅ AI-powered macro calculation with image analysis
- ✅ Separate daily weight tracking system
- ✅ Image upload for food and health entries
- ✅ Full CRUD operations (create, read, update, delete)
- ✅ Modern UI components

**Next steps:**
1. Visit `http://localhost:3000`
2. Create an account at `/auth/signup` OR sign in with Google
3. Sign in and start exploring!

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your GitHub repository
3. Add all environment variables from your `.env` to Vercel
4. **Update Google OAuth for production:**
   - Go back to Google Cloud Console
   - Add production redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
5. Update `prisma/schema.prisma` to use PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
6. Deploy!

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

### View Data (SQLite Browser)
```bash
npx prisma studio
```

### Reset Database
```bash
npx prisma db push --force-reset
```

### Switch to PostgreSQL (Production)
1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Add PostgreSQL connection string to `.env`:
   ```env
   DATABASE_URL="postgresql://username:password@host:port/database"
   ```
3. Run migrations:
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
```bash
npx prisma generate
npm run build
```

**Authentication not working:**
- Check NEXTAUTH_SECRET is set
- Verify NEXTAUTH_URL matches your domain

**Google OAuth not working:**
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set correctly
- Check redirect URIs in Google Cloud Console match your domain
- Ensure Google+ API is enabled

**AI features not working:**
- Verify GOOGLE_AI_API_KEY is set correctly
- Check your Google AI Studio quota

**Image uploads failing:**
- Verify all Cloudinary environment variables are set
- Check your Cloudinary account limits

## 📊 Development Workflow

### Adding New Features
1. Update database schema in `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Add tRPC routes in `src/server/api/routers/`
4. Create React components in `src/components/`
5. Add pages in `src/app/`

### Code Quality
```bash
npm run lint      # Check for linting errors
npm run build     # Check for build errors
```

## 🎯 Feature Overview

The application now includes:

### 🔐 **Authentication System**
- **Email/Password**: Traditional sign-up and login
- **Google OAuth**: One-click Gmail sign-in
- **Unified Experience**: Same features regardless of auth method

### 📊 **Weight Tracking**
- **Daily Prompts**: Automatic prompting for missing weight
- **Smart Display**: Today's weight or latest with date fallback
- **One Per Day**: Database constraint ensures single entry per date
- **Easy Access**: Always-available "Add weight" button

### 🍽️ **Food Tracking**
- **AI-Powered**: Automatic macro calculation using Google Gemini
- **Image Enhancement**: Upload food photos for better accuracy
- **Full CRUD**: Create, edit, delete meal entries
- **Visual History**: Thumbnails and complete macro breakdowns

### 🏥 **Health Monitoring**
- **Bristol Stool Scale**: Medical-grade intestinal health tracking
- **Photo Documentation**: Visual health records
- **Pain Assessment**: 0-10 scale with visual indicators
- **Full CRUD**: Create, edit, delete health entries

### 📸 **Image Management**
- **Multiple Sources**: File upload or camera capture
- **Auto-Optimization**: Cloudinary handles resizing and delivery
- **AI Integration**: Images improve macro calculation accuracy

### 🎨 **User Experience**
- **Responsive Design**: Works on all devices
- **Real-time Updates**: Optimistic UI updates
- **Error Handling**: Comprehensive error feedback
- **Loading States**: Clear visual feedback during operations

### 📱 **Dashboard**
- **Daily Overview**: Calories, meals, health entries, weight
- **Quick Actions**: Easy access to add new entries
- **Recent Activity**: Latest meals and health entries with thumbnails
- **Smart Weight Management**: Prompts and fallbacks for weight tracking

## 📈 Next Implementation Steps

The foundation is complete! Future enhancements could include:

1. **Data Visualization**
   - Charts and graphs for trends
   - Weekly/monthly summaries
   - Correlation analysis between metrics

2. **Advanced Features**
   - Physical activity tracking
   - Sleep pattern monitoring
   - Export capabilities
   - Advanced search and filtering

3. **Analytics**
   - Health pattern recognition
   - Dietary correlation analysis
   - Personalized insights and recommendations 