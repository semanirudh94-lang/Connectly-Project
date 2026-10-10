
import groq from "../config/groq.js";

// Shared guard: groq is null when GROQ_API is not configured.
const unavailable = (res) =>
  res.status(503).json({
    success: false,
    code: "ai_unavailable",
    message: "AI assistance is not configured on this server.",
  });

export const generateCaption = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!groq) return unavailable(res);

    if (!prompt) {
      return res.status(400).json({
        success: false,
        code: "ai_prompt_required",
        message: "Prompt is required",
      });
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are an Instagram content creator. Generate one engaging Instagram caption with relevant emojis and 8-12 hashtags. Return only the caption.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    res.status(200).json({
      success: true,
      caption: completion.choices[0].message.content,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const rewriteMessage = async (req, res) => {
  try {
    const { message, tone } = req.body;

    if (!groq) return unavailable(res);

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        {
          role: "system",
          content: `Rewrite the message in a ${tone || "friendly"} tone. Return only the rewritten message`,
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
