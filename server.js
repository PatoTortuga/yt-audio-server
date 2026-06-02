const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

app.post('/extract', async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing YouTube URL" });
  }

  try {
    console.log(`Extracting audio stream for URL: ${url}`);
    
    // Use yt-dlp to extract the best audio stream URL natively
    const output = await youtubedl(url, {
      dumpJson: true,
      format: 'bestaudio',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      ],
      noPlaylist: true // Critical fix: Prevents full playlist parsing
    });

    if (!output || !output.url) {
      throw new Error("Could not extract a valid audio URL from the video.");
    }

    console.log(`Extraction successful. Stream URL found.`);
    res.json({ audioUrl: output.url });
  } catch (error) {
    console.error("Extraction failed:", error.message);
    res.status(500).json({ error: "Extraction failed", details: error.message });
  }
});

app.listen(port, () => {
  console.log(`yt-audio-server is listening on port ${port}`);
});
