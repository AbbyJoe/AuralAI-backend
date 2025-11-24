import express from 'express';
import cors from 'cors';
import { JSON_LIMIT } from './config/env.js';
import apiRoutes from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: JSON_LIMIT }));
app.use('/api', apiRoutes);

export default app;

