import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { searchTracks } from "../api";
import SpotifyPlayer from "./SpotifyPlayer";

export default function Room() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [socket, setSocket] = useState(null);
  const [deviceId, setDeviceId] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.emit("join_room", id);
    
    newSocket.on("queue_update", (newQueue) => {
      setQueue(newQueue);
    });

    newSocket.on("playback_update", (playbackState) => {
      setCurrentTrack(playbackState.currentTrack);
    });

    newSocket.on("host_assigned", (hostStatus) => {
      setIsHost(hostStatus);
    });
    
    return () => newSocket.disconnect();
  }, [id]);

  const handlePlayerReady = (spotifyDeviceId) => {
    setDeviceId(spotifyDeviceId);
    setIsHost(true);
    
    if (socket) {
      socket.emit("set_host_device", { roomCode: id, deviceId: spotifyDeviceId });
    }
  };

  const handlePlaybackUpdate = (playbackState) => {
    setCurrentTrack(playbackState.currentTrack);
    
    if (socket && isHost) {
      socket.emit("playback_update", { roomCode: id, playbackState });
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
      roomCode: id,
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
      socket.emit("remove_from_queue", { roomCode: id, index });
      
    } catch (error) {
      console.error('Error playing from queue:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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
      <h2>Room: {id}</h2>
      
      {isHost && <p style={{ color: "#1DB954", fontWeight: "bold" }}>🎵 You are the music host!</p>}
      
      {/* Spotify Player */}
      <SpotifyPlayer 
        onPlayerReady={handlePlayerReady}
        onPlaybackUpdate={handlePlaybackUpdate}
      />
      
      {/* Queue Section */}
      <div style={sectionStyle}>
        <h3>Queue ({queue.length} songs):</h3>
        {queue.length === 0 ? (
          <p style={{ color: "#888" }}>No songs in queue yet. Add some songs below!</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {queue.map((track, i) => (
              <li key={i} style={trackStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  {track.image && (
                    <img 
                      src={track.image} 
                      alt="Album cover" 
                      style={{ width: "40px", height: "40px", borderRadius: "4px" }}
                    />
                  )}
                  <div>
                    <strong>{track.name}</strong>
                    <br />
                    <span style={{ color: "#888" }}>{track.artist}</span>
                  </div>
                </div>
                {isHost && (
                  <button 
                    onClick={() => playFromQueue(i)}
                    style={buttonStyle}
                  >
                    ▶️ Play
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search Section */}
      <div style={sectionStyle}>
        <h3>Search Songs</h3>
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
                    {isHost && (
                      <button 
                        onClick={() => playTrack(track.uri)}
                        style={buttonStyle}
                      >
                        ▶️ Play Now
                      </button>
                    )}
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