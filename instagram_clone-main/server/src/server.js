import 'dotenv/config';


import http from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import { initSocket } from "./socket.js";
import { startStoryExpiryJob } from "./jobs/storyExpiry.job.js";
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSocket(server);
const startServer = async () => {
  try {
    await connectDB();
    startStoryExpiryJob();
    server.listen(PORT, () => {
      console.log("--------------------------------");
      console.log(`🚀 Server Running`);
      console.log(`🌍 http://localhost:${PORT}`);
      console.log("--------------------------------");
    });
  } catch (error) {
    console.error("Server failed:", error.message);
    process.exit(1);
  }
};
startServer();
