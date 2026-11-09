import dotenv from 'dotenv';
// Load .env BEFORE anything reads process.env
dotenv.config({ quiet: true });

import express from 'express';
import type { Server } from 'node:http';
import { connectDatabase, disconnectDatabase } from './models/database';
import { getJwtSecret } from './service/user';
import userRoutes from './routes/user.route';
import postRoutes from './routes/post.routes';
import commentRoutes from './routes/comment.routes';
import { errorHandler, notFoundHandler } from './utils/error';

const app = express();

app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'API is running' });
});

app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', commentRoutes);

// These two must stay LAST
app.use(notFoundHandler);
app.use(errorHandler);

async function start(): Promise<void> {
  getJwtSecret(); // stop early if JWT_SECRET is missing or too short
  await connectDatabase();

  const port = Number(process.env.PORT) || 3000;
  const server: Server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => {
      disconnectDatabase()
        .catch((error) => console.error('Error while disconnecting:', error))
        .finally(() => process.exit(0));
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('Failed to start the server:', error instanceof Error ? error.message : error);
  process.exit(1);
});