import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

async function bootstrap() {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`[Server] LeaseLedger API listening on http://localhost:${env.PORT}`);
    console.log(`[Server] Environment: ${env.NODE_ENV} | Client URL: ${env.CLIENT_URL}`);
  });

  const gracefulShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[Server] Process terminated cleanly.');
      process.exit(0);
    });

    // Force exit after 10s if connections refuse to close
    setTimeout(() => {
      console.error('[Server] Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Server] Failed to bootstrap application:', err);
  process.exit(1);
});
