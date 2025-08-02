import { useEffect, useState } from "react";
import { QRCodeSVG } from 'qrcode.react';
import io from "socket.io-client";
import { searchTracks } from "../api";
import SpotifyPlayer from "./SpotifyPlayer";

export default function CreateRoom() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [socket, setSocket] = useState(null);
  const [queue, setQueue] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Check if tokens are in URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get("access_token");
    const refreshToken = urlParams.get("refresh_token");

    if (accessToken) {
      localStorage.setItem("spotify_access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("spotify_refresh_token", refreshToken);
      }
      // Remove tokens from URL
      window.history.replaceState({}, document.title, "/create");
    }

    const token = localStorage.getItem("spotify_access_token");
    if (!token) {
      // Not logged in → Redirect to backend login
      window.location.href = "http://127.0.0.1:5000/login";
      return;
    }

    // Fetch Spotify profile
    fetch("http://127.0.0.1:5000/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setUser(data);
        // Generate a random 6-character room code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(code);
        
        // Initialize socket connection as host
        const newSocket = io("http://localhost:5000");
        setSocket(newSocket);
        
        newSocket.emit("create_room", code);
        
        newSocket.on("queue_update", (newQueue) => {
          setQueue(newQueue);
        });

        newSocket.on("users_update", (users) => {
          setConnectedUsers(users);
        });

        newSocket.on("playback_update", (playbackState) => {
          setCurrentTrack(playbackState.currentTrack);
        });
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
      });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handlePlayerReady = (spotifyDeviceId) => {
    setDeviceId(spotifyDeviceId);
    
    if (socket) {
      socket.emit("set_host_device", { roomCode, deviceId: spotifyDeviceId });
    }
  };

  const handlePlaybackUpdate = (playbackState) => {
    setCurrentTrack(playbackState.currentTrack);
    
    if (socket) {
      socket.emit("playback_update", { roomCode, playbackState });
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await searchTracks(search);
      setTracks(results.tracks || []);
    } catch (error) {
      console.error("Search error:", error);
      setTracks([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = (track) => {
    if (!socket) return;

    const trackData = {
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      uri: track.uri,
      preview_url: track.preview_url,
      image: track.album?.images?.[0]?.url,
      duration_ms: track.duration_ms
    };

    socket.emit("add_to_queue", {
      roomCode,
      track: trackData
    });
  };

  const playTrack = async (trackUri) => {
    if (!deviceId) {
      alert("Player not ready. Make sure you have Spotify Premium and the player is connected.");
      return;
    }

    const token = localStorage.getItem('spotify_access_token');
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [trackUri]
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const playFromQueue = async (index) => {
    if (queue.length === 0 || !deviceId) return;
    
    const token = localStorage.getItem('spotify_access_token');
    const tracksToPlay = queue.slice(index).map(track => track.uri);
    
    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: tracksToPlay
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Remove played track from queue
      socket.emit("remove_from_queue", { roomCode, index });
      
    } catch (error) {
      console.error('Error playing from queue:', error);
    }
  };

  const removeFromQueue = (index) => {
    if (socket) {
      socket.emit("remove_from_queue", { roomCode, index });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!user) {
    return <h2 style={{ color: "#fff", textAlign: "center" }}>Loading...</h2>;
  }

  const containerStyle = {
    backgroundColor: "#121212",
    minHeight: "100vh",
    color: "#fff",
    padding: "20px",
    fontFamily: "Arial, sans-serif"
  };

  const sectionStyle = {
    backgroundColor: "#1e1e1e",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  };

  const trackStyle = {
    backgroundColor: "#2a2a2a",
    padding: "10px",
    borderRadius: "4px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const buttonStyle = {
    padding: "5px 15px",
    fontSize: "14px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff",
    marginLeft: "10px"
  };

  const removeButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#e22134"
  };

  const inputStyle = {
    padding: "10px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "#333",
    color: "#fff",
    marginRight: "10px",
    width: "300px"
  };

  const searchButtonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      {/* Header Section */}
      <div style={sectionStyle}>
        <h1>🎵 Room Host Dashboard</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "15px" }}>
          <img
            src={user.images?.[0]?.url}
            alt="Profile"
            style={{ borderRadius: "50%", width: "60px", height: "60px" }}
          />
          <div>
            <p style={{ margin: 0, fontSize: "18px" }}>Welcome, <strong>{user.display_name}!</strong></p>
            <p style={{ margin: 0, color: "#1DB954" }}>🎛️ You are the Room Host</p>
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "30px", alignItems: "center" }}>
          <div>
            <p style={{ margin: "5px 0" }}>Room Code: <strong style={{ fontSize: "24px", color: "#1DB954" }}>{roomCode}</strong></p>
            <p style={{ margin: "5px 0", color: "#aaa" }}>Connected Users: <strong>{connectedUsers.length}</strong></p>
          </div>
          <div>
            <QRCodeSVG
              value={`http://localhost:5173/join?code=${roomCode}`}
              size={120}
              bgColor="#fff"
              fgColor="#121212"
            />
            <p style={{ marginTop: "5px", fontSize: "12px", color: "#aaa", textAlign: "center" }}>Share QR or code</p>
          </div>
        </div>
      </div>

      {/* Connected Users */}
      {connectedUsers.length > 0 && (
        <div style={sectionStyle}>
          <h3>👥 Connected Users ({connectedUsers.length})</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {connectedUsers.map((user, index) => (
              <div key={index} style={{
                backgroundColor: "#2a2a2a",
                padding: "8px 12px",
                borderRadius: "20px",
                fontSize: "14px"
              }}>
                👤 {user.name || `User ${index + 1}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spotify Player - Host Controls */}
      <SpotifyPlayer 
        onPlayerReady={handlePlayerReady}
        onPlaybackUpdate={handlePlaybackUpdate}
      />
      
      {/* Queue Section with Host Controls */}
      <div style={sectionStyle}>
        <h3>🎵 Queue ({queue.length} songs):</h3>
        {queue.length === 0 ? (
          <p style={{ color: "#888" }}>No songs in queue yet. Search and add songs below, or wait for users to add songs!</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {queue.map((track, i) => (
              <li key={i} style={trackStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                  {track.image && (
                    <img 
                      src={track.image} 
                      alt="Album cover" 
                      style={{ width: "50px", height: "50px", borderRadius: "4px" }}
                    />
                  )}
                  <div>
                    <strong>{track.name}</strong>
                    <br />
                    <span style={{ color: "#888" }}>{track.artist}</span>
                  </div>
                </div>
                <div>
                  <button 
                    onClick={() => playFromQueue(i)}
                    style={buttonStyle}
                  >
                    ▶️ Play
                  </button>
                  <button 
                    onClick={() => removeFromQueue(i)}
                    style={removeButtonStyle}
                  >
                    🗑️ Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search Section */}
      <div style={sectionStyle}>
        <h3>🔍 Search & Add Songs</h3>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for songs..."
            style={inputStyle}
          />
          <button 
            onClick={handleSearch} 
            disabled={isSearching}
            style={searchButtonStyle}
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
        
        {tracks.length > 0 && (
          <div>
            <h4>Search Results:</h4>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {tracks.map((track, i) => (
                <li key={i} style={trackStyle}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "15px" }}>
                    {track.album?.images?.[0] && (
                      <img 
                        src={track.album.images[0].url} 
                        alt="Album cover" 
                        style={{ width: "50px", height: "50px", borderRadius: "4px" }}
                      />
                    )}
                    <div>
                      <strong>{track.name}</strong>
                      <br />
                      <span style={{ color: "#888" }}>
                        {track.artists?.map(artist => artist.name).join(", ")}
                      </span>
                      <br />
                      <small style={{ color: "#666" }}>
                        {track.album?.name}
                      </small>
                    </div>
                  </div>
                  <div>
                    <button 
                      onClick={() => handleAdd(track)}
                      style={buttonStyle}
                    >
                      + Add to Queue
                    </button>
                    <button 
                      onClick={() => playTrack(track.uri)}
                      style={buttonStyle}
                    >
                      ▶️ Play Now
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}