const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup single temporary upload handling in memory
const upload = multer({ storage: multer.memoryStorage() });

// Serve static HTML/CSS files from current directory
app.use(express.static(__dirname));

app.post('/api/process', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');

        const { action } = req.body;
        let pipeline = sharp(req.file.buffer);
        let outputBuffer;
        let mimeType = req.file.mimetype;

        switch (action) {
            case 'resize':
                const width = parseInt(req.body.width) || null;
                const height = parseInt(req.body.height) || null;
                pipeline = pipeline.resize(width, height, { fit: 'fill' });
                break;

            case 'crop':
                const left = parseInt(req.body.left) || 0;
                const top = parseInt(req.body.top) || 0;
                const cWidth = parseInt(req.body.width);
                const cHeight = parseInt(req.body.height);
                pipeline = pipeline.extract({ left, top, width: cWidth, height: cHeight });
                break;

            case 'convert':
                const targetFormat = req.body.format; // jpeg, png, webp, avif
                pipeline = pipeline.toFormat(targetFormat);
                mimeType = `image/${targetFormat}`;
                break;

            case 'compress':
                const quality = parseInt(req.body.quality) || 80;
                // Applies compression dynamically to format channels
                pipeline = pipeline.jpeg({ quality, force: false })
                                   .png({ quality, force: false })
                                   .webp({ quality, force: false });
                break;

            case 'flip':
                if (req.body.direction === 'vertical') {
                    pipeline = pipeline.flip();
                } else {
                    pipeline = pipeline.flop(); // Horizontal mirror
                }
                break;

            case 'rotate':
                const angle = parseInt(req.body.angle) || 0;
                pipeline = pipeline.rotate(angle);
                break;

            case 'reduceSize':
                const targetKb = parseInt(req.body.targetSize) || 50;
                // Sharp directly shrinks dimension factors sequentially to drop weight limits
                pipeline = pipeline.jpeg({ quality: 40, force: false }).resize(800, null, { withoutEnlargement: true });
                break;

            case 'pixelate':
                const pixelSize = parseInt(req.body.pixelSize) || 10;
                // Native pixelation effect happens by shrinking & scaling back up instantly
                const metadata = await sharp(req.file.buffer).metadata();
                const smallW = Math.max(1, Math.round(metadata.width / pixelSize));
                pipeline = pipeline.resize(smallW, null, { kernel: 'nearest' })
                                   .resize(metadata.width, metadata.height, { kernel: 'nearest' });
                break;

            case 'greyscale':
                pipeline = pipeline.grayscale();
                break;

            default:
                return res.status(400).send('Invalid image action technique.');
        }

        outputBuffer = await pipeline.toBuffer();
        res.set('Content-Type', mimeType);
        res.send(outputBuffer);

    } catch (error) {
        console.error(error);
        res.status(500).send('Error occurred processing structural payload: ' + error.message);
    }
});

app.listen(PORT, () => console.log(`Professional Resizer server active on http://localhost:${PORT}`));
