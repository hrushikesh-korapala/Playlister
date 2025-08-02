import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import http from 'http';

import { Server } from 'socket.io';


dotenv.config();


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Spotify credentials (store these in environment variables)
const PORT = 5000;
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URL || "http://localhost:5000/callback";

app.use(cors());
app.use(express.json());

// In-memory storage for rooms and queues (use database in production)
const rooms = new Map();

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

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room ${roomCode}`);
        
        // Initialize room if it doesn't exist
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, { 
                queue: [], 
                users: [], 
                hostDevice: null,
                currentPlayback: null 
            });
        }
        
        // Send current queue to the user
        const room = rooms.get(roomCode);
        socket.emit('queue_update', room.queue);
        
        // Send current playback state if available
        if (room.currentPlayback) {
            socket.emit('playback_update', room.currentPlayback);
        }
    });
    
    socket.on('add_to_queue', (data) => {
        const { roomCode, track } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.queue.push(track);
            // Broadcast updated queue to all users in the room
            io.to(roomCode).emit('queue_update', room.queue);
            console.log(`Added "${track.name}" to queue in room ${roomCode}`);
        }
    });

    socket.on('remove_from_queue', (data) => {
        const { roomCode, index } = data;
        const room = rooms.get(roomCode);
        
        if (room && room.queue[index]) {
            const removedTrack = room.queue.splice(index, 1)[0];
            // Broadcast updated queue to all users in the room
            io.to(roomCode).emit('queue_update', room.queue);
            console.log(`Removed "${removedTrack.name}" from queue in room ${roomCode}`);
        }
    });

    socket.on('set_host_device', (data) => {
        const { roomCode, deviceId } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.hostDevice = deviceId;
            console.log(`Set host device ${deviceId} for room ${roomCode}`);
            // Let everyone know who the host is
            io.to(roomCode).emit('host_assigned', true);
        }
    });

    socket.on('playback_update', (data) => {
        const { roomCode, playbackState } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.currentPlayback = playbackState;
            // Broadcast playback state to all users except sender
            socket.to(roomCode).emit('playback_update', playbackState);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

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
app.get("/callback", async (req, res) => {
    const { code, state } = req.query;

    const codeVerifier = codeVerifiers.get(state);
    if (!codeVerifier) {
        return res.status(400).send("Invalid state parameter");
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

        // Clean up state
        codeVerifiers.delete(state);

        // Redirect to frontend with tokens
        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;

        res.redirect(
            `http://localhost:5173/create?access_token=${accessToken}&refresh_token=${refreshToken}`
        );
    } catch (error) {
        console.error("Token exchange error:", error.response?.data);
        res.status(400).send("Failed to exchange code for token");
    }
});

// Create room endpoint
app.post("/api/rooms", (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms.set(roomCode, { queue: [], users: [] });
    res.json({ roomCode });
});

// Get room info
app.get("/api/rooms/:code", (req, res) => {
    const { code } = req.params;
    const room = rooms.get(code);
    
    if (room) {
        res.json({ exists: true, queue: room.queue });
    } else {
        res.json({ exists: false });
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

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(
        "Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables",
    );
});