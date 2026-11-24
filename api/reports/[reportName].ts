import fs from 'fs';
import path from 'path';

export default function handler(req: any, res: any) {
  const raw = req.query?.reportName;
  const reportName = Array.isArray(raw) ? raw[0] : raw;
  const allowed = ['cleaning_report.txt', 'eda_report.txt', 'model_evaluation.txt'];
  if (!reportName || !allowed.includes(reportName)) {
    return res.status(400).json({ error: 'Invalid report name' });
  }
  const candidateDirs = [
    path.join(process.cwd(), 'Reports'),
    path.resolve('Reports'),
  ];
  for (const dir of candidateDirs) {
    const filePath = path.join(dir, reportName);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(fs.readFileSync(filePath, 'utf-8'));
    }
  }
  return res.status(404).send('Report not found');
}
