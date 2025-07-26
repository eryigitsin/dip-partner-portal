import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express();

// Simple multer setup
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'test');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

app.post('/test-upload', upload.single('file'), (req, res) => {
  console.log('File received:', req.file);
  console.log('Body:', req.body);
  res.json({ 
    success: true, 
    file: req.file,
    body: req.body 
  });
});

app.get('/test', (req, res) => {
  res.send(`
    <form action="/test-upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
  `);
});

app.listen(5001, () => {
  console.log('Test server running on port 5001');
});