import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/db.js';
import { autoSubmitExpiredAttempts } from './services/examService.js';

const PORT = env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database via Prisma');

    app.listen(PORT, () => {
      console.log(`🚀 Secure Exam API server running on port ${PORT} [${env.NODE_ENV}]`);

      // Start automatic background sweeper (runs every 30 seconds)
      const SWEEPER_INTERVAL_MS = 30 * 1000;
      setInterval(async () => {
        try {
          const finalized = await autoSubmitExpiredAttempts();
          if (finalized > 0) {
            console.log(`⏰ [EXAM SWEEPER] Auto-finalized ${finalized} expired assessment attempt(s) at deadline.`);
          }
        } catch (err) {
          console.error('⚠️ [EXAM SWEEPER ERROR]:', err.message);
        }
      }, SWEEPER_INTERVAL_MS);
      console.log('🛡️ Automatic deadline background sweeper initialized (30s heartbeat)');
    });
  } catch (error) {

    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
}

startServer();
