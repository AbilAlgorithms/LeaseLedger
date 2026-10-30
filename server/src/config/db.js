import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

let memoryServer = null;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    // Attempt connecting to the configured URI with a 3-second timeout for fast fallback
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      maxPoolSize: 20,
    });
    console.log(`[Database] MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (err) {
    if (env.NODE_ENV !== 'production') {
      console.warn(`[Database] Standalone MongoDB not reachable at ${env.MONGODB_URI}. Initializing embedded in-memory MongoDB server for development...`);
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memUri = memoryServer.getUri();
        await mongoose.connect(memUri);
        console.log(`[Database] Embedded in-memory MongoDB connected successfully at ${memUri}`);
      } catch (memErr) {
        console.error('[Database] Failed to start embedded MongoDB server:', memErr.message);
        process.exit(1);
      }
    } else {
      console.error('[Database] MongoDB connection failed:', err.message);
      process.exit(1);
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });
}

export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (err) {
    console.error('[Database] Error during disconnect:', err.message);
  }
}
