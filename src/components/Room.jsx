import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { searchTracks, addToQueue } from "../api";

const socket = io("http://localhost:5000"); // backend URL

export default function Room() {
  const { id } = useParams();
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    socket.emit("join_room", id);
    socket.on("queue_update", (newQueue) => setQueue(newQueue));
    return () => socket.disconnect();
  }, [id]);

  const handleSearch = async () => {
    const results = await searchTracks(search);
    setTracks(results.tracks);
  };

  const handleAdd = async (uri) => {
    await addToQueue(uri);
    socket.emit("update_queue", id);
  };

  return (
    <div>
      <h2>Room: {id}</h2>
      <h3>Queue:</h3>
      <ul>
        {queue.map((track, i) => (
          <li key={i}>{track.name}</li>
        ))}
      </ul>

      <h3>Search Songs</h3>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>
      <ul>
        {tracks.map((track, i) => (
          <li key={i}>
            {track.name} - {track.artists[0].name}{" "}
            <button onClick={() => handleAdd(track.uri)}>Add</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
