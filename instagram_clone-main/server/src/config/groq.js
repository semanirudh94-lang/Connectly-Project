import Groq from "groq-sdk";

// The AI caption/rewrite helpers are a bonus feature, not an assignment
// requirement — so a missing key must not take the whole server down. Without
// GROQ_API we export null and the controllers answer 503 instead.
const groq = process.env.GROQ_API
  ? new Groq({ apiKey: process.env.GROQ_API })
  : null;

export default groq;
