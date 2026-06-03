const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');
const fs = require('fs');

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
  console.log("No YOUTUBE_COOKIES environment variable found. Proceeding without cookies.");
}

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
    
    const options = {
      dumpJson: true,
      format: 'bestaudio/best',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: [
        'referer:youtube.com',
        'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      ],
      noPlaylist: true, // Critical fix: Prevents full playlist parsing
      extractorArgs: 'youtube:player_client=android,web_safari'
    };

    if (fs.existsSync(COOKIES_PATH)) {
      console.log("Injecting YouTube cookies into extraction request.");
      options.cookies = COOKIES_PATH;
    }

    // Diagnostic run to see exactly what YouTube is offering our IP
    try {
      console.log("Running diagnostic: fetching available formats...");
      const formatOptions = { ...options };
      delete formatOptions.format;
      delete formatOptions.dumpJson;
      formatOptions.listFormats = true;
      const formatsOutput = await youtubedl(url, formatOptions);
      console.log("--- FORMATS DIAGNOSTIC START ---");
      console.log(formatsOutput);
      console.log("--- FORMATS DIAGNOSTIC END ---");
    } catch (diagError) {
      console.error("Diagnostic format listing failed:", diagError.message);
    }

    // Use yt-dlp to extract the best audio stream URL natively
    const output = await youtubedl(url, options);

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
