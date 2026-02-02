# Jeep-Track - Development Guide

## 🎯 Project Overview
Jeep-Track is a real-time jeepney tracking system for the Philippines, connecting drivers and commuters through GPS location sharing.

## 📦 Project Structure

```
JEEP-TRACK/
├── backend/          # Express.js + Socket.io server
├── mobile/           # React Native (Expo) mobile app
├── shared/           # Shared types, schemas, and utilities
└── database/         # Supabase schema
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (via Supabase)
- Expo CLI for mobile development

### Installation

1. **Install all dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   
   Backend (`backend/.env`):
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   SUPABASE_ANON_KEY=your-anon-key
   PORT=3000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000,http://localhost:8081
   ```
   
   Mobile (`mobile/.env`):
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Build shared package:**
   ```bash
   cd shared
   npm run build
   ```

4. **Run the backend:**
   ```bash
   cd backend
   npm run dev
   ```

5. **Run the mobile app:**
   ```bash
   cd mobile
   npm start
   ```

## 🛠️ Development Workflow

### Building the Shared Package
The `shared` package contains TypeScript types, schemas, and utilities used by both backend and mobile:

```bash
cd shared
npm run build        # Build once
npm run watch        # Watch mode for development
```

### Backend Development
```bash
cd backend
npm run dev          # Development with auto-reload
npm run build        # Build for production
npm start            # Run production build
```

### Mobile Development
```bash
cd mobile
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS (Mac only)
```

## 🏗️ Architecture

### Backend Architecture
- **Express.js**: REST API endpoints
- **Socket.io**: Real-time location updates
- **Supabase**: PostgreSQL database with RLS
- **In-memory store**: Active driver locations for performance

### Mobile Architecture
- **Expo Router**: File-based navigation
- **Zustand**: State management
- **Socket.io Client**: Real-time updates
- **Expo Location**: GPS tracking

### Data Flow
1. **Driver shares location** → Mobile app → Socket.io → Backend
2. **Backend stores** → In-memory cache + Supabase database
3. **Backend broadcasts** → Socket.io → Subscribed commuters
4. **Commuters receive** → Real-time map updates

## 📚 Key Features Implemented

### ✅ Completed
- User authentication (signup/signin)
- Real-time GPS location tracking
- Socket.io integration for live updates
- Route management
- Jeepney tracking
- Background location updates (Android/iOS)
- Input validation and sanitization
- Error handling middleware
- Rate limiting
- TypeScript type safety
- Shared utilities (distance calculation, ETA)

### 🔧 Technical Improvements Made
1. **Type Safety**:
   - Fixed Zod error handling (`error.issues` instead of `error.errors`)
   - Added socket event type definitions
   - Fixed async TaskManager callback

2. **Security**:
   - Input sanitization middleware
   - UUID validation
   - Environment variable validation
   - XSS protection

3. **Performance**:
   - In-memory location cache
   - Socket.io ping/pong configuration
   - Request body size limits
   - Debounce/throttle utilities

4. **Developer Experience**:
   - Consistent file naming
   - Shared utilities package
   - Environment examples
   - Asset placeholders created

## 🔐 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet.js**: Security headers
- **CORS**: Configurable origins
- **Input Sanitization**: XSS prevention
- **Supabase RLS**: Row-level security
- **UUID Validation**: Prevent injection
- **Environment Validation**: Required vars in production

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out

### Routes
- `GET /api/routes` - List all routes
- `GET /api/routes/:id` - Get route details
- `GET /api/routes/code/:code` - Get route by code
- `POST /api/routes` - Create route (auth required)

### Jeepneys
- `GET /api/jeepneys` - List all jeepneys
- `GET /api/jeepneys/route/:routeId` - Get jeepneys by route

### Locations
- `GET /api/locations/live` - All live jeepneys
- `GET /api/locations/live/route/:routeId` - Live jeepneys on route
- `POST /api/locations/eta` - Calculate ETA

## 🔌 Socket.io Events

### Client → Server
- `driver:start-sharing` - Driver starts sharing location
- `driver:location-update` - Driver sends location update
- `driver:stop-sharing` - Driver stops sharing
- `commuter:subscribe-route` - Subscribe to route updates
- `commuter:unsubscribe-route` - Unsubscribe from route

### Server → Client
- `jeepney:location-updated` - Jeepney location changed
- `jeepney:went-offline` - Jeepney disconnected
- `route:jeepneys-update` - Full list of jeepneys on route

## 🧪 Testing

### Manual Testing
1. Start backend server
2. Create test accounts (driver and commuter)
3. Driver: Start sharing location
4. Commuter: Subscribe to route
5. Verify real-time updates

### Database Testing
Run the schema in Supabase SQL Editor:
```bash
backend/database/schema.sql
```

## 🐛 Troubleshooting

### "Cannot find module shared"
```bash
cd shared
npm run build
```

### Backend won't start
- Check `.env` file exists
- Verify Supabase credentials
- Check port 3000 is available

### Mobile app crashes on location
- Grant location permissions
- Check API_URL is correct
- Verify backend is running

### TypeScript errors
```bash
# Rebuild shared package
cd shared
rm -rf dist
npm run build

# Restart TypeScript server in VS Code
Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

## 📝 Code Quality

### Standards Followed
- **TypeScript Strict Mode**: Full type safety
- **ESLint**: Code linting (configured)
- **Error Handling**: Try-catch with proper messages
- **Async/Await**: Modern promise handling
- **Input Validation**: Zod schemas
- **Naming Conventions**: camelCase for variables, PascalCase for types

## 🚀 Deployment

### Backend (Vercel/Heroku/Railway)
1. Set environment variables
2. Build: `npm run build`
3. Start: `npm start`

### Mobile (Expo)
```bash
# Build for production
expo build:android
expo build:ios

# Or use EAS Build
eas build --platform android
eas build --platform ios
```

## 📊 Performance Tips

1. **Database Indexing**: Already configured in schema
2. **Location Caching**: In-memory store for active locations
3. **Socket Rooms**: Route-based broadcasting
4. **Lazy Loading**: Load data as needed
5. **Debouncing**: Limit location update frequency

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Build shared package if modified
4. Test thoroughly
5. Submit PR with description

## 📄 License
MIT

## 👥 Support
For issues, create a GitHub issue or contact the development team.
