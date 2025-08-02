import { useState } from "react";
import { createRoom } from "../api";
import QRCode from "qrcode.react";

export default function CreateRoom() {
  const [room, setRoom] = useState(null);

  const handleCreate = async () => {
    const data = await createRoom();
    setRoom(data);
  };

  return (
    <div>
      <h2>Create Room</h2>
      <button onClick={handleCreate}>Create</button>
      {room && (
        <div style={{ marginTop: "20px" }}>
          <p>Room Code: <b>{room.code}</b></p>
          <QRCode value={`http://localhost:5173/join?code=${room.code}`} />
        </div>
      )}
    </div>
  );
}
