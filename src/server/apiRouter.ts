import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { processAssistantQuery, streamAssistantQuery } from '../services/aiAnalystService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const apiRouter = Router();

// AI Analyst status check endpoint (no model/provider details exposed)
apiRouter.all('/ai-status', (_req, res) => {
  return res.json({
    ready: true,
    status: 'ready',
  });
});

// Streaming AI Analyst SSE Endpoint (low-latency incremental rendering)
apiRouter.post('/assistant/stream', async (req, res) => {
  const { query, context, history } = req.body || {};
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`: stream-open\n\n`);

  let closed = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      closed = true;
    }
  });

  try {
    const result = await streamAssistantQuery({
      query: (query || '').trim(),
      context: context || {},
      history: history || [],
      onMeta: (meta) => {
        if (!closed && meta.stageText) {
          res.write(`data: ${JSON.stringify({ type: 'stage', stageText: meta.stageText })}\n\n`);
        }
      },
      onSnapshot: (text) => {
        if (!closed) {
          res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
        }
      },
    });
    if (!closed) {
      res.write(`data: ${JSON.stringify({ type: 'done', text: result.fullText, intent: result.intent })}\n\n`);
      res.end();
    }
  } catch (err: any) {
    console.error('Error processing /api/assistant/stream:', err);
    if (!closed) {
      const errorMsg = err?.message || 'Failed to process inquiry';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg, status: err?.status || 500 })}\n\n`);
      res.end();
    }
  }
});

// Standard JSON AI Analyst Endpoint
apiRouter.post('/assistant', async (req, res) => {
  const { query, context, history } = req.body || {};
  try {
    const result = await processAssistantQuery({
      query: (query || '').trim(),
      context: context || {},
      history: history || [],
    });
    return res.json(result);
  } catch (err: any) {
    console.error('Error processing /api/assistant:', err);
    const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
    return res.status(status).json({ error: err?.message || 'Failed to process inquiry' });
  }
});

// API endpoint for reports content inspection in UI
apiRouter.get('/reports/:reportName', (req, res) => {
  const { reportName } = req.params;
  const allowed = ['cleaning_report.txt', 'eda_report.txt', 'model_evaluation.txt'];
  if (!allowed.includes(reportName)) {
    return res.status(400).json({ error: 'Invalid report name' });
  }
  const candidateDirs = [
    path.join(process.cwd(), 'Reports'),
    path.join(__dirname, '../../Reports'),
  ];
  for (const dir of candidateDirs) {
    const filePath = path.join(dir, reportName);
    if (fs.existsSync(filePath)) {
      return res.type('text/plain').send(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  return res.status(404).send('Report not found');
});
