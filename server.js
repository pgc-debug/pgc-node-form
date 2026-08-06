const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep uploads in memory only — nothing touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB cap
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- Resize endpoint ---
app.post('/resize', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    let { width, height, keepAspect, format, quality } = req.body;
    width = width ? parseInt(width, 10) : null;
    height = height ? parseInt(height, 10) : null;
    quality = quality ? parseInt(quality, 10) : 82;
    keepAspect = keepAspect === 'true';
    format = (format || 'original').toLowerCase();

    if (!width && !height) {
      return res.status(400).json({ error: 'Provide at least a width or height.' });
    }

    let pipeline = sharp(req.file.buffer).rotate(); // .rotate() auto-orients via EXIF

    const resizeOptions = {
      fit: keepAspect ? 'inside' : 'fill',
      withoutEnlargement: false
    };
    pipeline = pipeline.resize(width || null, height || null, resizeOptions);

    let outFormat = format;
    if (outFormat === 'original') {
      const meta = await sharp(req.file.buffer).metadata();
      outFormat = meta.format === 'jpg' ? 'jpeg' : meta.format;
      if (!['jpeg', 'png', 'webp', 'avif'].includes(outFormat)) outFormat = 'jpeg';
    }

    if (outFormat === 'jpeg') pipeline = pipeline.jpeg({ quality });
    else if (outFormat === 'png') pipeline = pipeline.png({ quality: Math.min(quality, 100) });
    else if (outFormat === 'webp') pipeline = pipeline.webp({ quality });
    else if (outFormat === 'avif') pipeline = pipeline.avif({ quality });

    const outputBuffer = await pipeline.toBuffer();
    const outMeta = await sharp(outputBuffer).metadata();

    res.set({
      'Content-Type': `image/${outFormat}`,
      'X-Output-Width': outMeta.width,
      'X-Output-Height': outMeta.height,
      'Access-Control-Expose-Headers': 'X-Output-Width, X-Output-Height'
    });
    res.send(outputBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not process that image. Try a different file.' });
  }
});

app.listen(PORT, () => {
  console.log(`Image resizer running on port ${PORT}`);
});
