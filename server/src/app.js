import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/security.js';
import apiRouter from './routes/index.js';

const app = express();

// Security Headers
app.use(helmet());

// Cross-Origin Resource Sharing with credentials
app.use(cors(corsOptions));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1', apiRouter);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  const status = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = status === 500 && isProduction
    ? 'Internal Server Error'
    : (err.message || 'Internal Server Error');

  const response = {
    success: false,
    error: message,
    ...(err.data && { data: err.data }),
    ...(err.details && { details: err.details })
  };

  res.status(status).json(response);
});

export default app;
