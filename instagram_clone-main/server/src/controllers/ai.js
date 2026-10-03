
import groq from "../config/groq.js";

export const generateCaption = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(404).json({
        success: false,
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
