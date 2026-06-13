import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import RoomHost from "./pages/RoomHost";
import RoomMember from "./pages/RoomMember";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId/host" element={<RoomHost />} />
        <Route path="/room/:roomId/member" element={<RoomMember />} />
        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
