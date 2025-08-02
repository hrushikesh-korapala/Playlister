import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import UserRoom from "./components/UserRoom";

function Home() {
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    textAlign: "center",
    backgroundColor: "#121212",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    justifyContent: "center"
  };

  const buttonStyle = {
    padding: "15px 30px",
    fontSize: "18px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#fff",
    textDecoration: "none",
    fontWeight: "bold",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "10px"
  };

  const titleStyle = {
    fontSize: "3rem",
    marginBottom: "20px",
    background: "linear-gradient(45deg, #1DB954, #1ed760)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: "bold"
  };

  const subtitleStyle = {
    fontSize: "1.2rem",
    color: "#aaa",
    marginBottom: "40px"
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>🎵 PLAYLISTER</h1>
      <p style={subtitleStyle}>Create collaborative Spotify playlists with friends</p>
      <div style={buttonContainerStyle}>
        <Link to="/create" style={buttonStyle}>
          🎛️ Create Room (Host)
        </Link>
        <Link to="/join" style={buttonStyle}>
          👥 Join Room (Guest)
        </Link>
      </div>
      <div style={{ marginTop: "40px", color: "#666", fontSize: "14px", textAlign: "center" }}>
        <p>🎯 <strong>Host:</strong> Control playback, manage queue, see connected users</p>
        <p>👤 <strong>Guest:</strong> Add songs to the shared queue</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/create"
          element={<CreateRoom />}
        />
        <Route 
          path="/join" 
          element={<JoinRoom />} 
        />
        <Route 
          path="/room/:id" 
          element={<UserRoom />} 
        />
      </Routes>
    </Router>
  );
}