import cron from "node-cron";
import Post from "../models/Post.model.js";
import User from "../models/User.model.js";
import { sendPostPublishedEmail } from "../services/mailer.js";

// How many times the scheduler will retry a failing post before giving up and
// marking it "failed" (recorded in lastError for the user/admin to see).
const MAX_PUBLISH_ATTEMPTS = 3;

// Publishes one due post. Throws on failure so the caller can record the error.
async function publishPost(post) {
  post.status = "published";
  post.publishedAt = new Date();
  await post.save();

  // Keep the user's post counter in sync with immediate posts.
  await User.findByIdAndUpdate(post.user, { $inc: { PostCount: 1 } });
}

// Runs every minute: finds scheduled posts whose time has come and publishes
// them. Failures are retried up to MAX_PUBLISH_ATTEMPTS, then marked "failed".
export const startPostSchedulerJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      const due = await Post.find({
        status: "scheduled",
        isDeleted: false,
        scheduledFor: { $lte: now },
      });

      if (due.length === 0) return;

      for (const post of due) {
        try {
          await publishPost(post);

          // Email is best-effort — a delivery problem must not undo a publish.
          try {
            const owner = await User.findById(post.user).select(
              "email fullName",
            );
            if (owner?.email) {
              await sendPostPublishedEmail({
                to: owner.email,
                fullName: owner.fullName || "there",
                caption: post.caption,
                scheduledFor: post.scheduledFor,
                publishedAt: post.publishedAt,
              });
            }
          } catch (mailErr) {
            console.log(
              `[postScheduler] email failed for post ${post._id}: ${mailErr.message}`,
            );
          }

          console.log(
            `[postScheduler] published post ${post._id} for user ${post.user}`,
          );
        } catch (err) {
          post.publishAttempts = (post.publishAttempts || 0) + 1;
          post.lastError = err.message;

          if (post.publishAttempts >= MAX_PUBLISH_ATTEMPTS) {
            post.status = "failed";
            console.log(
              `[postScheduler] post ${post._id} FAILED permanently after ${post.publishAttempts} attempts: ${err.message}`,
            );
          } else {
            console.log(
              `[postScheduler] post ${post._id} publish attempt ${post.publishAttempts} failed: ${err.message} (will retry)`,
            );
          }

          await post.save();
        }
      }
    } catch (err) {
      console.log("[postScheduler] error:", err.message);
    }
  });
  console.log("[postScheduler] scheduled every minute");
};
