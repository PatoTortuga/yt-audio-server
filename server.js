const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;
const COOKIES_PATH = '/tmp/cookies.txt';

if (process.env.YOUTUBE_COOKIES) {
  try {
    fs.writeFileSync(COOKIES_PATH, process.env.YOUTUBE_COOKIES, 'utf8');
    console.log("Successfully wrote YOUTUBE_COOKIES to " + COOKIES_PATH);
  } catch (error) {
    console.error("Failed to write YouTube cookies file:", error);
  }
} else {
  console.log("No YOUTUBE_COOKIES environment variable found.");
}

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: "ok" }));

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing YouTube URL" });

  const tempId = crypto.randomBytes(8).toString('hex');
  const outputPath = `/tmp/audio_${tempId}.webm`;

  try {
    console.log(`Starting proxy download sequence for URL: ${url}`);
    
    const options = {
      format: 'bestaudio/best',
      extractAudio: true,
      audioFormat: 'webm',
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      ],
      noPlaylist: true,
      extractorArgs: 'youtube:player_client=android,web_safari'
    };

    if (fs.existsSync(COOKIES_PATH)) options.cookies = COOKIES_PATH;
    if (process.env.PROXY_URL) options.proxy = process.env.PROXY_URL;

    // Execute physical download
    await youtubedl(url, options);

    if (!fs.existsSync(outputPath)) {
      throw new Error("yt-dlp finished but output file was not generated.");
    }

    console.log(`Download successful. Streaming binary data back to Netlify...`);
    res.setHeader('Content-Type', 'audio/webm');
    
    const readStream = fs.createReadStream(outputPath);
    readStream.pipe(res);
    
    readStream.on('end', () => {
      try { fs.unlinkSync(outputPath); } catch(e){} 
      console.log(`Cleaned up temp file: ${outputPath}`);
    });

    readStream.on('error', (err) => {
      console.error("Error streaming file:", err);
      if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e){} }
    });

  } catch (error) {
    console.error("Extraction failed:", error.message);
    if (fs.existsSync(outputPath)) { try { fs.unlinkSync(outputPath); } catch(e){} }
    
    if (!res.headersSent) {
      res.status(500).json({ error: "Extraction failed", details: error.message });
    }
  }
});

app.listen(port, () => console.log(`yt-audio-server is listening on port ${port}`));
