import cron from "node-cron";
import Story from "../models/Story.model.js";

export const startStoryExpiryJob = () => {
  cron.schedule("*/10 * * * *", async () => {
    try {
      const res = await Story.updateMany(
        { isActive: true, expiresAt: { $lte: new Date() } },
        { $set: { isActive: false, isArchived: true } }
      );
      if (res.modifiedCount) {
        console.log(
          `[storyExpiry] archived ${res.modifiedCount} expired story(ies)`
        );
      }
    } catch (err) {
      console.log("[storyExpiry] error:", err.message);
    }
  });
  console.log("[storyExpiry] scheduled every 10 minutes");
};
