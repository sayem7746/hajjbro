import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { loggingMiddleware, notFoundHandler, globalErrorHandler } from './middleware/index.js';
import routes from './routes/index.js';

const app = express();

app.use(
  cors({
    origin: (env.CORS_ORIGINS ?? '*') === '*' ? true : (env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(loggingMiddleware);

app.get('/', (_req, res) => {
  res.json({ name: 'HajjBro API', version: '1.0.0', docs: `${env.API_PREFIX}/health` });
});

app.use(env.API_PREFIX, routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
