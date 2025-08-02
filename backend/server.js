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
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
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
    
    // Handle room creation (for hosts)
    socket.on('create_room', (data) => {
        const roomCode = typeof data === 'string' ? data : data.roomCode;
        const hostInfo = typeof data === 'object' ? data.hostInfo : null;
        
        socket.join(roomCode);
        console.log(`Host ${socket.id} created room ${roomCode}`);
        
        // Initialize room with host info
        rooms.set(roomCode, {
            host: socket.id,
            hostInfo: hostInfo,
            queue: [],
            users: [{
                id: socket.id,
                name: hostInfo?.display_name || 'Host',
                isHost: true
            }],
            hostDevice: null,
            currentPlayback: null
        });
        
        // Confirm room creation
        socket.emit('joined_room', { status: 'success', role: 'host' });
        socket.emit('users_update', rooms.get(roomCode).users);
        socket.emit('queue_update', rooms.get(roomCode).queue);
    });
    
    // Handle room joining (for users)
    socket.on('join_room', (data) => {
        const roomCode = typeof data === 'string' ? data : data.roomCode;
        const userName = typeof data === 'object' ? data.userName : `User${Math.floor(Math.random() * 1000)}`;
        
        socket.join(roomCode);
        console.log(`User ${socket.id} (${userName}) joined room ${roomCode}`);
        
        // Get or initialize room
        if (!rooms.has(roomCode)) {
            rooms.set(roomCode, {
                host: null,
                hostInfo: null,
                queue: [],
                users: [],
                hostDevice: null,
                currentPlayback: null
            });
        }
        
        const room = rooms.get(roomCode);
        
        // Add user to room if not already present
        const existingUser = room.users.find(user => user.id === socket.id);
        if (!existingUser) {
            room.users.push({
                id: socket.id,
                name: userName,
                isHost: false
            });
        }
        
        // Send current state to the user
        socket.emit('joined_room', { status: 'success', role: 'guest' });
        socket.emit('queue_update', room.queue);
        
        // Send current playback state if available
        if (room.currentPlayback) {
            socket.emit('playback_update', room.currentPlayback);
        }
        
        // Update all users about the new connection
        io.to(roomCode).emit('users_update', room.users);
        
        console.log(`Room ${roomCode} now has ${room.users.length} users:`, room.users.map(u => u.name));
    });
    
    // Handle adding tracks to queue
    socket.on('add_to_queue', (data) => {
        const { roomCode, track } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            // Add timestamp and ensure addedBy is set
            const enhancedTrack = {
                ...track,
                addedAt: new Date().toISOString(),
                addedBy: track.addedBy || 'Unknown'
            };
            
            room.queue.push(enhancedTrack);
            
            // Broadcast updated queue to all users in the room
            io.to(roomCode).emit('queue_update', room.queue);
            console.log(`Added "${track.name}" by ${track.addedBy} to queue in room ${roomCode}. Queue length: ${room.queue.length}`);
        } else {
            console.error(`Room ${roomCode} not found when trying to add track`);
        }
    });

    // Handle removing tracks from queue (host only)
    socket.on('remove_from_queue', (data) => {
        const { roomCode, index } = data;
        const room = rooms.get(roomCode);
        
        if (room && room.queue[index]) {
            // Check if user is host
            const user = room.users.find(u => u.id === socket.id);
            if (user && user.isHost) {
                const removedTrack = room.queue.splice(index, 1)[0];
                // Broadcast updated queue to all users in the room
                io.to(roomCode).emit('queue_update', room.queue);
                console.log(`Host removed "${removedTrack.name}" from queue in room ${roomCode}`);
            } else {
                console.log(`Non-host user ${socket.id} tried to remove track from room ${roomCode}`);
            }
        }
    });

    // Handle host device setting
    socket.on('set_host_device', (data) => {
        const { roomCode, deviceId } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.hostDevice = deviceId;
            room.host = socket.id; // Ensure this user is marked as host
            
            // Update user to be host if not already
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isHost = true;
            }
            
            console.log(`Set host device ${deviceId} for room ${roomCode}`);
            // Let everyone know who the host is
            io.to(roomCode).emit('host_assigned', true);
            io.to(roomCode).emit('users_update', room.users);
        }
    });

    // Handle playback updates from host
    socket.on('playback_update', (data) => {
        const { roomCode, playbackState } = data;
        const room = rooms.get(roomCode);
        
        if (room) {
            room.currentPlayback = playbackState;
            // Broadcast playback state to all users except sender
            socket.to(roomCode).emit('playback_update', playbackState);
            console.log(`Playback updated in room ${roomCode}:`, playbackState.currentTrack?.name || 'No track');
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Remove user from all rooms
        rooms.forEach((room, roomCode) => {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                const removedUser = room.users.splice(userIndex, 1)[0];
                console.log(`Removed ${removedUser.name} from room ${roomCode}`);
                
                // Update remaining users
                io.to(roomCode).emit('users_update', room.users);
                
                // If host disconnected, you might want to assign new host or close room
                if (removedUser.isHost && room.users.length > 0) {
                    // Assign first remaining user as host
                    room.users[0].isHost = true;
                    room.host = room.users[0].id;
                    io.to(roomCode).emit('users_update', room.users);
                    console.log(`New host assigned in room ${roomCode}: ${room.users[0].name}`);
                } else if (room.users.length === 0) {
                    // Remove empty room
                    rooms.delete(roomCode);
                    console.log(`Deleted empty room ${roomCode}`);
                }
            }
        });
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

// Create room endpoint (REST API - optional, since we handle this via sockets now)
app.post("/api/rooms", (req, res) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({ roomCode });
});

// Get room info
app.get("/api/rooms/:code", (req, res) => {
    const { code } = req.params;
    const room = rooms.get(code);
    
    if (room) {
        res.json({ 
            exists: true, 
            queue: room.queue,
            users: room.users,
            userCount: room.users.length
        });
    } else {
        res.json({ exists: false });
    }
});

// Debug endpoint to see all rooms
app.get("/api/debug/rooms", (req, res) => {
    const roomData = {};
    rooms.forEach((room, code) => {
        roomData[code] = {
            userCount: room.users.length,
            queueLength: room.queue.length,
            users: room.users.map(u => ({ name: u.name, isHost: u.isHost })),
            hasHost: !!room.host
        };
    });
    res.json(roomData);
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
    console.log("Rooms system initialized. Debug endpoint: http://localhost:5000/api/debug/rooms");
    console.log(
        "Make sure to set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables",
    );
});