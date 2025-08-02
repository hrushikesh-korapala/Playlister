const express = require("express");
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");

const app = express();

// Spotify credentials (store these in environment variables)
const PORT = process.env.PORT;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "your_client_id";
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "your_client_secret";
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URL;

app.use(cors());
app.use(express.json());

// Generate random string for state parameter
function generateRandomString(length) {
    return crypto.randomBytes(60).toString("hex").slice(0, length);
}

// Base64 URL encode
function base64URLEncode(str) {
    return str
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

// Generate code verifier and challenge for PKCE
function generateCodeChallenge() {
    const codeVerifier = base64URLEncode(crypto.randomBytes(32));
    const codeChallenge = base64URLEncode(
        crypto.createHash("sha256").update(codeVerifier).digest(),
    );
    return { codeVerifier, codeChallenge };
}

// Store code verifiers temporarily (use Redis or database in production)
const codeVerifiers = new Map();

// Login endpoint
app.get("/login", (req, res) => {
    const state = generateRandomString(16);
    const { codeVerifier, codeChallenge } = generateCodeChallenge();

    // Store code verifier
    codeVerifiers.set(state, codeVerifier);

    const scope =
        "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state";

    const params = new URLSearchParams({
        response_type: "code",
        client_id: CLIENT_ID,
        scope: scope,
        redirect_uri: REDIRECT_URI,
        state: state,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params}`);
});

// Callback endpoint
app.post("/callback", async (req, res) => {
    const { code, state } = req.body;

    const codeVerifier = codeVerifiers.get(state);
    if (!codeVerifier) {
        return res.status(400).json({ error: "Invalid state parameter" });
    }

    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                code_verifier: codeVerifier,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        // Clean up
        codeVerifiers.delete(state);

        res.json(response.data);
    } catch (error) {
        console.error("Token exchange error:", error.response?.data);
        res.status(400).json({ error: "Failed to exchange code for token" });
    }
});

// Refresh token endpoint
app.post("/refresh", async (req, res) => {
    const { refresh_token } = req.body;

    try {
        const response = await axios.post(
            "https://accounts.spotify.com/api/token",
            new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refresh_token,
                client_id: CLIENT_ID,
            }),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            },
        );

        res.json(response.data);
    } catch (error) {
        console.error("Token refresh error:", error.response?.data);
        res.status(400).json({ error: "Failed to refresh token" });
    }
});

// Proxy Spotify API requests
app.get("/api/me", async (req, res) => {
    const token = req.headers.authorization;

    try {
        const response = await axios.get("https://api.spotify.com/v1/me", {
            headers: { Authorization: token },
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Search tracks
app.get("/api/search", async (req, res) => {
    const token = req.headers.authorization;
    const { q, type = "track", limit = 20 } = req.query;

    try {
        const response = await axios.get("https://api.spotify.com/v1/search", {
            headers: { Authorization: token },
            params: { q, type, limit },
        });
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get user's playlists
app.get("/api/playlists", async (req, res) => {
    const token = req.headers.authorization;

    try {
        const response = await axios.get(
            "https://api.spotify.com/v1/me/playlists",
            {
                headers: { Authorization: token },
            },
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

// Get playlist tracks
app.get("/api/playlists/:id/tracks", async (req, res) => {
    const token = req.headers.authorization;
    const { id } = req.params;

    try {
        const response = await axios.get(
            `https://api.spotify.com/v1/playlists/${id}/tracks`,
            {
                headers: { Authorization: token },
            },
        );
        res.json(response.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(
        "Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables",
    );
});
