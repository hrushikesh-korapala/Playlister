import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { searchTracks } from "../api";

const socket = io("http://localhost:5000");

export default function Room() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    socket.emit("join_room", id);
    
    socket.on("queue_update", (newQueue) => {
      setQueue(newQueue);
    });
    
    return () => socket.disconnect();
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
    // Add track to queue via socket
    socket.emit("add_to_queue", {
      roomCode: id,
      track: {
        name: track.name,
        artist: track.artists[0]?.name || "Unknown Artist",
        uri: track.uri,
        preview_url: track.preview_url,
        image: track.album?.images?.[0]?.url
      }
    });
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

  const queueStyle = {
    backgroundColor: "#1e1e1e",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
  };

  const searchStyle = {
    backgroundColor: "#1e1e1e",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "20px"
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

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "16px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff"
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

  const addButtonStyle = {
    padding: "5px 15px",
    fontSize: "14px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    color: "#fff"
  };

  return (
    <div style={containerStyle}>
      <h2>Room: {id}</h2>
      
      {/* Queue Section */}
      <div style={queueStyle}>
        <h3>Queue ({queue.length} songs):</h3>
        {queue.length === 0 ? (
          <p style={{ color: "#888" }}>No songs in queue yet. Add some songs below!</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {queue.map((track, i) => (
              <li key={i} style={trackStyle}>
                <div>
                  <strong>{track.name}</strong>
                  <br />
                  <span style={{ color: "#888" }}>{track.artist}</span>
                </div>
                {track.image && (
                  <img 
                    src={track.image} 
                    alt="Album cover" 
                    style={{ width: "40px", height: "40px", borderRadius: "4px" }}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search Section */}
      <div style={searchStyle}>
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
            style={buttonStyle}
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
                  <div style={{ flex: 1 }}>
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
                  {track.album?.images?.[0] && (
                    <img 
                      src={track.album.images[0].url} 
                      alt="Album cover" 
                      style={{ width: "50px", height: "50px", borderRadius: "4px", margin: "0 10px" }}
                    />
                  )}
                  <button 
                    onClick={() => handleAdd(track)}
                    style={addButtonStyle}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}