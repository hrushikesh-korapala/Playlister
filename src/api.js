import axios from "axios";

const API_BASE = "http://localhost:5000"; // Your backend URL

export const createRoom = async () => {
  const res = await axios.get(`${API_BASE}/create-room`);
  return res.data;
};

// Get auth token from localStorage
const getAuthToken = () => {
    const token = localStorage.getItem("spotify_access_token");
    return token ? `Bearer ${token}` : null;
  };
  
  // Join a room
  export const joinRoom = async (roomCode) => {
    try {
      // For now, we'll simulate joining a room
      // In a real app, you'd validate the room code with your backend
      if (roomCode && roomCode.length >= 3) {
        return { success: true, roomCode };
      }
      return { success: false, error: "Invalid room code" };
    } catch (error) {
      console.error("Error joining room:", error);
      return { success: false, error: error.message };
    }
  };
  
  // Search for tracks
  export const searchTracks = async (query) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }
  
      const response = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
        headers: {
          Authorization: token,
        },
      });
  
      if (!response.ok) {
        throw new Error("Search failed");
      }
  
      const data = await response.json();
      return {
        tracks: data.tracks?.items || [],
      };
    } catch (error) {
      console.error("Error searching tracks:", error);
      return { tracks: [] };
    }
  };
  