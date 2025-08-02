import axios from "axios";

const API_BASE = "http://localhost:5000"; // Your backend URL

export const createRoom = async () => {
  const res = await axios.get(`${API_BASE}/create-room`);
  return res.data;
};

export const joinRoom = async (code) => {
  const res = await axios.post(`${API_BASE}/join-room`, { code });
  return res.data;
};

export const searchTracks = async (query) => {
  const res = await axios.get(`${API_BASE}/search?q=${query}`);
  return res.data;
};

export const addToQueue = async (uri) => {
  const res = await axios.post(`${API_BASE}/add-to-queue`, { uri });
  return res.data;
};
