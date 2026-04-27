import express from 'express';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.use(errorHandler);

const start = async () => {
  try {
    await initDatabase();
    app.listen(config.port, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${config.port}`);
      console.log(`API docs: http://47.100.186.167:${config.port}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
