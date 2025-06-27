import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing form data' });
    const file = files.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const fileData = fs.readFileSync(file.filepath);
    const fileName = `prod/${Date.now()}-${file.originalFilename}`;
    const { data, error } = await supabase.storage
      .from('prod')
      .upload(fileName, fileData, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (error) return res.status(500).json({ error: error.message });
    const { data: publicUrlData } = supabase.storage.from('prod').getPublicUrl(fileName);
    res.status(200).json({ url: publicUrlData.publicUrl });
  });
} 