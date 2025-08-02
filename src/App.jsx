import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import CreateRoom from "./components/CreateRoom"; //
function Home() {
  const containerStyle = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw", // <-- Full width
    textAlign: "center",
    backgroundColor: "#121212",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  };

  const buttonContainerStyle = {
    display: "flex",
    gap: "20px", // spacing between buttons
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
        <a href="/create" style={buttonStyle}>Create Room</a>
        <a href="/join" style={buttonStyle}>Join Room</a>
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
          element={<div style={{ textAlign: "center" }}><CreateRoom /></div>}
        />

        <Route path="/join" element={<h2 style={{ textAlign: "center" }}>Join Page</h2>} />
      </Routes>
    </Router>
  );
}
