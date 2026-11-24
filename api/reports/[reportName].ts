import { AUDIT_REPORTS } from '../../src/data/reportsData';

export default function handler(req: any, res: any) {
  const raw = req.query?.reportName;
  const reportName = Array.isArray(raw) ? raw[0] : raw;
  if (!reportName || !AUDIT_REPORTS[reportName]) {
    return res.status(404).send('Report not found');
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(AUDIT_REPORTS[reportName]);
}
