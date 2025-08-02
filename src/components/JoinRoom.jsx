import { useState } from "react";
import { joinRoom } from "../api";
import { useNavigate } from "react-router-dom";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();

  const handleJoin = async () => {
    const data = await joinRoom(code);
    if (data.success) {
      navigate(`/room/${code}`);
    }
  };

  return (
    <div>
      <h2>Join Room</h2>
      <input
        type="text"
        placeholder="Enter Room Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button onClick={handleJoin}>Join</button>
    </div>
  );
}
