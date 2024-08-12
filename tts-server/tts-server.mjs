import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// Use CORS middleware
app.use(cors());

// Function to normalize language codes
const normalizeLanguage = (lang) => {
  const baseLang = lang.split("-")[0].toLowerCase();
  switch (baseLang) {
    case "en":
      return "en"; // English
    case "de":
      return "de"; // German (Deutsch)
    case "fr":
      return "fr"; // French
    case "ar":
      return "ar"; // Arabic
    // Add other language cases here as needed
    default:
      return baseLang; // Fallback to the base language code
  }
};

app.get("/translate_tts", async (req, res) => {
  let { text, lang } = req.query;
  // lang = normalizeLanguage(lang); // Normalize the language code
  const url = `https://translate.google.com/translate_tts?client=tw-ob&q=${encodeURIComponent(
    text
  )}&tl=${lang}`;
  console.log("Requesting URL:", url); // Log the URL
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error fetching audio:", error); // Log the error
    res.status(500).send("Error fetching audio");
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Proxy server listening on port ${port}`);
});
