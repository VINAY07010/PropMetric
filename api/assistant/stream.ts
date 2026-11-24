import { streamAssistantQuery } from '../../src/services/aiAnalystService';

function parseBody(req: any): Record<string, any> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { query, context, history } = parseBody(req);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  res.write(`: stream-open\n\n`);

  let closed = false;
  req.on?.('close', () => {
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
}
