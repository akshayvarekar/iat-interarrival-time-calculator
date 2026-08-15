import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { handleAiInsightsChat } from './src/server/geminiService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Insights chat endpoint
  app.post('/api/insights', async (req, res) => {
    try {
      const { message, history, context } = req.body || {};
      if (!message || !context) {
        return res.status(400).json({ error: 'Missing required parameters: message and context.' });
      }

      const result = await handleAiInsightsChat(message, history, context);
      return res.json(result);
    } catch (error: any) {
      console.error('Error in /api/insights:', error);
      return res.status(500).json({
        error: error?.message || 'An internal server error occurred while processing AI insights.',
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
