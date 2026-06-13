const express = require("express");
const cors = require("cors");
const app = express();

// อนุญาต CORS จาก frontend — ตั้ง FRONTEND_URL ใน Render environment variables
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  process.env.FRONTEND_URL, // เช่น https://grocerytrip.vercel.app
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // อนุญาต request ที่ไม่มี origin (เช่น curl, Postman) และ origin ที่อยู่ใน list
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} ไม่ได้รับอนุญาต`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());

app.use("/api/rooms", require("./routes/roomRoutes"));
app.use("/api/rooms", require("./routes/memberRoutes"));
app.use("/api/rooms", require("./routes/itemRoutes"));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาด" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on :${PORT}`));
