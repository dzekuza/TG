import { createClient } from '@supabase/supabase-js';
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

  const formidable = (await import('formidable')).default;
  const form = formidable();

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Error parsing form data' });

    // Log files object for debugging
    console.log('Formidable files:', files);

    // Support any field name, fallback to first file, and handle array
    let file = files.file || Object.values(files)[0];
    if (Array.isArray(file)) file = file[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    let fileData;
    if (file.filepath) {
      fileData = fs.readFileSync(file.filepath);
    } else if (file.buffer) {
      fileData = file.buffer;
    } else {
      console.error('File object:', file);
      return res.status(400).json({ error: 'File data not found' });
    }

    const fileName = `prod/${Date.now()}-${file.originalFilename || file.newFilename || 'upload'}`;
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