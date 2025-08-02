import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CreateRoom from "./components/CreateRoom";
import JoinRoom from "./components/JoinRoom";
import Room from "./components/Room";

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
  };

  const buttonStyle = {
    padding: "12px 24px",
    fontSize: "18px",
    backgroundColor: "#1DB954",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    color: "#fff",
    textDecoration: "none",
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "20px" }}>PLAYLISTER</h1>
      <div style={buttonContainerStyle}>
        <Link to="/create" style={buttonStyle}>Create Room</Link>
        <Link to="/join" style={buttonStyle}>Join Room</Link>
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
          element={
            <div style={{ backgroundColor: "#121212", minHeight: "100vh" }}>
              <CreateRoom />
            </div>
          }
        />
        <Route 
          path="/join" 
          element={
            <div style={{ backgroundColor: "#121212", minHeight: "100vh", color: "#fff", padding: "20px" }}>
              <JoinRoom />
            </div>
          } 
        />
        <Route 
          path="/room/:id" 
          element={
            <div style={{ backgroundColor: "#121212", minHeight: "100vh", color: "#fff", padding: "20px" }}>
              <Room />
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}