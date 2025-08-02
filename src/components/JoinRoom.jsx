import { useState, useEffect } from "react";
import { joinRoom } from "../api";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Auto-fill code from QR scan or URL parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!code.trim()) {
      setError("Please enter a room code");
      return;
    }

    setIsJoining(true);
    setError("");
    
    try {
      const data = await joinRoom(code);
      if (data.success) {
        navigate(`/room/${code}`);
      } else {
        setError(data.error || "Failed to join room");
      }
    } catch (error) {
      setError("Failed to join room. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#121212",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
    padding: "20px"
  };

  const cardStyle = {
    backgroundColor: "#1e1e1e",
    padding: "40px",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    maxWidth: "400px",
    width: "100%",
    textAlign: "center"
  };

  const inputStyle = {
    width: "100%",
    padding: "15px",
    fontSize: "18px",
    borderRadius: "8px",
    border: "2px solid #444",
    backgroundColor: "#333",
    color: "#fff",
    marginBottom: "15px",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: "2px"
  };

  const buttonStyle = {
    width: "100%",
    padding: "15px",
    fontSize: "18px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#fff",
    fontWeight: "bold",
    transition: "all 0.3s ease"
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#666",
    cursor: "not-allowed"
  };

  const errorStyle = {
    color: "#e22134",
    backgroundColor: "#4d1e1e",
    padding: "10px",
    borderRadius: "4px",
    marginTop: "15px",
    fontSize: "14px"
  };

  const successStyle = {
    color: "#1DB954",
    fontSize: "14px",
    marginTop: "10px"
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "10px", fontSize: "2rem" }}>🎵 Join Room</h2>
        <p style={{ color: "#aaa", marginBottom: "30px" }}>
          Enter the room code to join the collaborative playlist
        </p>
        
        <input
          type="text"
          placeholder="ENTER ROOM CODE"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          style={inputStyle}
          maxLength={6}
          disabled={isJoining}
        />
        
        <button 
          onClick={handleJoin}
          disabled={isJoining || !code.trim()}
          style={isJoining || !code.trim() ? disabledButtonStyle : buttonStyle}
        >
          {isJoining ? "Joining..." : "👥 Join Room"}
        </button>

        {searchParams.get("code") && (
          <p style={successStyle}>
            ✅ Room code detected from QR scan!
          </p>
        )}

        {error && (
          <div style={errorStyle}>
            ❌ {error}
          </div>
        )}

        <div style={{ marginTop: "30px", padding: "15px", backgroundColor: "#1a2332", borderRadius: "8px" }}>
          <h4 style={{ color: "#1DB954", margin: "0 0 10px 0" }}>💡 As a Guest:</h4>
          <ul style={{ color: "#aaa", fontSize: "14px", textAlign: "left", paddingLeft: "20px", margin: 0 }}>
            <li>Search and add songs to the queue</li>
            <li>See what's currently playing</li>
            <li>View the upcoming song queue</li>
            <li>The host controls playback</li>
          </ul>
        </div>
      </div>
    </div>
  );
}