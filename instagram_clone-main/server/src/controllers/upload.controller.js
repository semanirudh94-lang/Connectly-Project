import cloudinary from "../config/cloudinary.js";

// Cloudinary folders per feature. Whitelisted so a client-supplied `folder`
// field can never write outside these paths.
const FOLDERS = {
  posts: "instai/posts",
  stories: "instai/stories",
};

// Server-side media upload -> Cloudinary (supports image + video).
// Keeps Cloudinary credentials on the server; client just POSTs multipart/form-data.
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const isVideo = (req.file.mimetype || "").startsWith("video");
    const resourceType = isVideo ? "video" : "image";
    const folder = FOLDERS[req.body?.folder] || FOLDERS.stories;

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder,
          // For images Cloudinary can infer; for video we keep original.
        },
        (error, uploaded) => {
          if (error) return reject(error);
          resolve(uploaded);
        },
      );
      stream.end(req.file.buffer);
    });

    const media = {
      url: result.secure_url,
      type: result.resource_type === "video" ? "video" : "image",
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      duration: result.duration ? Math.round(result.duration) : undefined,
    };

    return res.status(200).json({ success: true, media });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed",
    });
  }
};

// Destroy a Cloudinary asset by publicId (used when purging expired, non-highlighted stories).
export const destroyMedia = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.log("destroyMedia failed:", error.message);
  }
};
