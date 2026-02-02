import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketServer } from 'socket.io';
import { setupSocketHandlers } from './socket';
import { authRouter } from './routes/auth';
import { routesRouter } from './routes/routes';
import { jeepneysRouter } from './routes/jeepneys';
import { locationsRouter } from './routes/locations';
import { errorHandler } from './middleware/errorHandler';
import { sanitizeStrings } from './middleware/validation';

const app = express();
const server = http.createServer(app);

// Root route to prevent "Cannot GET /"
app.get('/', (req, res) => {
  res.send('🚌 Jeep-Track API is running');
  
});

// Socket.io setup
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Apply rate limiter to all routes
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(sanitizeStrings);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/routes', routesRouter);
app.use('/api/jeepneys', jeepneysRouter);
app.use('/api/locations', locationsRouter);

// Error handler
app.use(errorHandler);

// Setup socket handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.set('io', io);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`🚌 Jeep-Track server running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
