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

#### Authentication (Required)
```env
NEXTAUTH_SECRET="generate-a-random-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```
Generate a secret: `openssl rand -base64 32`

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
- ✅ Authentication system
- ✅ AI-powered macro calculation
- ✅ Modern UI components

**Next steps:**
1. Visit `http://localhost:3000`
2. Create an account at `/auth/signup`
3. Sign in and start exploring!

---

## 🌐 Production Deployment

### Option 1: Vercel (Recommended)
1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your GitHub repository
3. Add all environment variables from your `.env` to Vercel
4. Update `prisma/schema.prisma` to use PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. Deploy!

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

**AI features not working:**
- Verify GOOGLE_AI_API_KEY is set correctly
- Check your Google AI Studio quota

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

## 🎯 Next Implementation Steps

The foundation is complete! Now you can build:

1. **Food Tracking Pages** (`/food`)
   - Meal entry form
   - AI macro calculation display
   - Daily food log view

2. **Health Monitoring Pages** (`/health`)
   - Intestinal health entry form
   - Health pattern visualization

3. **Dashboard** (`/dashboard`)
   - Daily overview
   - Quick entry forms
   - Recent activity

4. **Advanced Features**
   - Image upload integration
   - Data correlation analysis
   - Export functionality

For issues or questions, check the troubleshooting section above or create an issue in the repository. 