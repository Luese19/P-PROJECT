# Jeep-Track 🚌

A real-time jeepney tracking app for the Philippines where drivers share their live GPS location and commuters can track jeepneys on a map with ETA calculations.

## Project Structure

```
JEEP-TRACK/
├── mobile/          # Expo React Native app
├── backend/         # Express.js API server
├── shared/          # Shared TypeScript types
└── README.md
```

## Features

### For Commuters
- 🗺️ Real-time map view with jeepney locations
- 📍 Track jeepneys on specific routes
- ⏱️ Get ETA for nearest jeepneys
- 🔔 Notifications when jeepney is approaching (coming soon)

### For Drivers
- 📡 Share GPS location in real-time
- 🛣️ Select your active route
- ✅ Start/stop location sharing

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Express.js with Socket.IO
- **Database**: Supabase (PostgreSQL)
- **Maps**: React Native Maps (Google Maps)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Google Maps API key (for Android)

### 1. Clone and Install

```bash
cd JEEP-TRACK
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the schema SQL in `backend/database/schema.sql`
3. Get your project URL and API keys from Settings > API

### 3. Configure Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CORS_ORIGIN=http://localhost:19006,http://localhost:8081
```

**Mobile** (`mobile/.env`):
```env
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_SOCKET_URL=http://localhost:3000
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run the Backend

```bash
npm run backend
```

The server will start at http://localhost:3000

### 5. Run the Mobile App

```bash
npm run mobile
```

Scan the QR code with Expo Go app on your phone.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Routes
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `GET /api/routes/code/:code` - Get route by code

### Jeepneys
- `GET /api/jeepneys` - Get all jeepneys
- `GET /api/jeepneys/:id` - Get jeepney by ID
- `GET /api/jeepneys/route/:routeId` - Get jeepneys for a route

### Locations
- `GET /api/locations/live` - Get all live jeepney locations
- `GET /api/locations/live/route/:routeId` - Get live locations for a route
- `POST /api/locations/eta` - Calculate ETA
- `POST /api/locations/nearest` - Find nearest jeepneys

## Socket Events

### Driver Events
- `driver:start-sharing` - Start sharing location
- `driver:location-update` - Send location update
- `driver:stop-sharing` - Stop sharing location

### Commuter Events
- `commuter:subscribe-route` - Subscribe to route updates
- `commuter:unsubscribe-route` - Unsubscribe from route

### Server Events
- `jeepney:location-updated` - Jeepney location update
- `jeepney:went-offline` - Jeepney went offline
- `route:jeepneys-update` - All jeepneys on route update

## Sample Routes

The database is seeded with these sample routes:
- **PASIG-CUBAO** - Pasig Palengke to Cubao via C5
- **CUBAO-PASIG** - Cubao to Pasig Palengke via C5
- **MAKATI-QUIAPO** - Makati CBD to Quiapo via EDSA

## Development

### Running in Development

```bash
# Terminal 1 - Backend
npm run backend

# Terminal 2 - Mobile
npm run mobile
```

### Building Shared Types

```bash
cd shared
npm run build
```

## Testing with Expo Go

1. Install Expo Go on your iOS/Android device
2. Run `npm run mobile`
3. Scan the QR code with your camera (iOS) or Expo Go app (Android)
4. Make sure your phone is on the same network as your development machine

## Notes

- For testing on a physical device, update `API_URL` and `SOCKET_URL` in `mobile/src/config/index.ts` to your computer's local IP address
- Google Maps API key is required for Android. Add it to `mobile/app.json`
- Location tracking requires physical device (won't work on emulator/simulator for real GPS)

## License

MIT
