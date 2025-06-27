import { put } from '@vercel/blob';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  // Parse multipart form data
  const boundary = req.headers['content-type'].split('boundary=')[1];
  const parts = buffer.toString().split('--' + boundary);
  const filePart = parts.find(p => p.includes('filename="'));
  if (!filePart) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const match = filePart.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : 'upload.jpg';
  const fileBuffer = Buffer.from(filePart.split('\r\n\r\n')[1].split('\r\n')[0], 'binary');
  // Upload to Vercel Blob
  const blob = await put(filename, fileBuffer, { access: 'public' });
  res.status(200).json({ url: blob.url });
} 