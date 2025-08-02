import { useEffect, useState } from "react";
import { QRCodeSVG } from 'qrcode.react';

export default function CreateRoom() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState("");

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
        setRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase());
      })
      .catch((err) => {
        console.error("Error fetching user:", err);
      });
  }, []);

  if (!user) {
    return <h2 style={{ color: "#fff", textAlign: "center" }}>Loading...</h2>;
  }

  return (
    <div
      style={{
        textAlign: "center",
        color: "#fff",
        padding: "20px",
        backgroundColor: "#121212",
        minHeight: "100vh",
      }}
    >
      <h1>Welcome, {user.display_name}!</h1>
      <img
        src={user.images?.[0]?.url}
        alt="Profile"
        style={{ borderRadius: "50%", width: "100px", margin: "10px" }}
      />
      <p>Your Room Code: <strong>{roomCode}</strong></p>
      <QRCodeSVG
        value={`http://localhost:5173/join?code=${roomCode}`}
        size={200}
        bgColor="#fff"
        fgColor="#121212"
      />
      <p style={{ marginTop: "10px" }}>Share this QR or code with your friends.</p>
    </div>
  );
}