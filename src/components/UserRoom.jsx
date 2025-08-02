import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { searchTracks } from "../api";

export default function UserRoom() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [socket, setSocket] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);

  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Get or create user name
    let name = localStorage.getItem("user_name");
    if (!name) {
      name = prompt("Enter your name:") || `Guest${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem("user_name", name);
    }
    setUserName(name);

    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    // Join room with user info
    newSocket.emit("join_room", { roomCode: id, userName: name });
    
    // Listen for queue updates
    newSocket.on("queue_update", (newQueue) => {
      console.log("User received queue update:", newQueue);
      setQueue(newQueue);
    });

    // Listen for playback updates
    newSocket.on("playback_update", (playbackState) => {
      setCurrentTrack(playbackState.currentTrack);
    });

    // Listen for connected users updates
    newSocket.on("users_update", (users) => {
      console.log("Users update received:", users);
      setConnectedUsers(users);
    });

    // Connection confirmation
    newSocket.on("joined_room", (data) => {
      console.log("Successfully joined room:", data);
    });
    
    return () => {
      console.log("Disconnecting from room:", id);
      newSocket.disconnect();
    };
  }, [id]);

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
    if (!socket) {
      console.error("Socket not connected");
      return;
    }

    const trackData = {
      name: track.name,
      artist: track.artists[0]?.name || "Unknown Artist",
      uri: track.uri,
      preview_url: track.preview_url,
      image: track.album?.images?.[0]?.url,
      duration_ms: track.duration_ms,
      addedBy: userName
    };

    console.log("User adding track:", trackData);
    socket.emit("add_to_queue", {
      roomCode: id,
      track: trackData
    });

    // Clear search after adding
    setTracks([]);
    setSearch("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const containerStyle = {
    backgroundColor: "#121212",
    minHeight: "100vh",
    width: "100%",
    maxWidth: "none",
    color: "#fff",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
    margin: 0,
    overflow: "auto"
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
    padding: "8px 16px",
    fontSize: "14px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff"
  };

  const inputStyle = {
    padding: "12px",
    fontSize: "16px",
    borderRadius: "4px",
    border: "1px solid #444",
    backgroundColor: "#333",
    color: "#fff",
    marginRight: "10px",
    width: "300px"
  };

  const searchButtonStyle = {
    padding: "12px 20px",
    fontSize: "16px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={sectionStyle}>
        <h2>🎵 Room: {id}</h2>
        <p style={{ color: "#1DB954", margin: "5px 0" }}>👤 You are a participant</p>
        <p style={{ color: "#aaa", margin: "5px 0" }}>Connected Users: {connectedUsers.length}</p>
        <p style={{ color: "#888", fontSize: "14px" }}>
          Add songs to the queue! The room host controls playback.
        </p>
      </div>

      {/* Current Playing */}
      {currentTrack && (
        <div style={sectionStyle}>
          <h3>🎶 Now Playing</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            {currentTrack.album?.images?.[0] && (
              <img 
                src={currentTrack.album.images[0].url} 
                alt="Album cover" 
                style={{ width: "60px", height: "60px", borderRadius: "8px" }}
              />
            )}
            <div>
              <p style={{ margin: "0", fontSize: "18px", fontWeight: "bold" }}>
                {currentTrack.name}
              </p>
              <p style={{ margin: "0", color: "#888" }}>
                {currentTrack.artists?.map(artist => artist.name).join(", ")}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Queue Display (Read-only for users) */}
      <div style={sectionStyle}>
        <h3>📝 Queue ({queue.length} songs)</h3>
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
                <div style={{ 
                  color: "#666", 
                  fontSize: "14px",
                  padding: "5px 10px",
                  backgroundColor: "#333",
                  borderRadius: "12px"
                }}>
                  #{i + 1}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search Section - Main feature for users */}
      <div style={sectionStyle}>
        <h3>🔍 Search & Add Songs</h3>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search for songs to add to the queue..."
            style={inputStyle}
          />
          <button 
            onClick={handleSearch} 
            disabled={isSearching}
            style={searchButtonStyle}
          >
            {isSearching ? "Searching..." : "🔍 Search"}
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
                  <button 
                    onClick={() => handleAdd(track)}
                    style={buttonStyle}
                  >
                    ➕ Add to Queue
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {search && tracks.length === 0 && !isSearching && (
          <p style={{ color: "#888", textAlign: "center", padding: "20px" }}>
            No results found. Try a different search term.
          </p>
        )}
      </div>

      {/* Help Section */}
      <div style={{ ...sectionStyle, backgroundColor: "#1a2332" }}>
        <h4 style={{ color: "#1DB954" }}>💡 How it works:</h4>
        <ul style={{ color: "#aaa", fontSize: "14px", paddingLeft: "20px" }}>
          <li>Search for songs and add them to the queue</li>
          <li>The room host controls playback and can remove songs</li>
          <li>Everyone can see what's currently playing and upcoming</li>
          <li>Your added songs will appear in the queue for everyone to see</li>
        </ul>
      </div>
    </div>
  );
}