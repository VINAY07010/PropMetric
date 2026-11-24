import { processAssistantQuery } from '../src/services/aiAnalystService';

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
  try {
    const result = await processAssistantQuery({
      query: (query || '').trim(),
      context: context || {},
      history: history || [],
    });
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Error processing /api/assistant:', err);
    const status = Number(err?.status) >= 400 && Number(err?.status) < 600 ? Number(err.status) : 500;
    return res.status(status).json({ error: err?.message || 'Failed to process inquiry' });
  }
}
