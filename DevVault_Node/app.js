import './config/env.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.routes.js';
import bookmarkRoutes from './routes/bookmark.routes.js';
import folderRoutes from './routes/folder.routes.js';
import tagRoutes from './routes/tag.routes.js';
import userRoutes from './routes/user.routes.js';
import noteRoutes from './routes/note.routes.js';
import snippetRoutes from './routes/snippet.routes.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

const app = express();

// Behind the host's reverse proxy, req.ip must come from X-Forwarded-For or
// every client shares one rate-limit bucket.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 0,
  })
);
// Snippet code is capped at 50,000 chars; 256kb leaves room for multi-byte text.
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// Only failed attempts count, so brute-forcing is throttled without locking out normal use.
// ponytail: in-memory store, per instance. Use a shared store if the API scales past one instance.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later', errors: [] },
});

app.get('/api/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'connected' : 'disconnected' });
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/snippets', snippetRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
