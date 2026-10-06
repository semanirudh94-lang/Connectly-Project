// Sends the language-change OTP over SMS.
//
// Twilio is OPTIONAL — it is imported dynamically only when credentials exist,
// so the server runs fine without the package installed.
//
// Free-tier setup (real SMS to your phone):
//   1. Sign up at https://www.twilio.com/try-twilio (free trial, no card).
//   2. Verify your phone number (trial accounts can only text verified numbers).
//   3. Grab a free trial number.
//   4. In .env set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.
//
// Without those, the code is printed to the server console (mock mode).
let cachedClient = null;

async function getClient() {
  if (cachedClient !== null) return cachedClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    cachedClient = false;
    return cachedClient;
  }

  try {
    const twilio = (await import("twilio")).default;
    cachedClient = twilio(sid, token);
  } catch {
    console.log("[sms] twilio package not installed — using console mock");
    cachedClient = false;
  }
  return cachedClient;
}

export async function sendOtpSms({ to, otp, minutes = 5 }) {
  const body = `Your InstAI verification code is ${otp}. It expires in ${minutes} minutes.`;
  const client = await getClient();

  if (!client) {
    console.log(`\n[SMS STUB] OTP for ${to} => ${otp} (set TWILIO_* in .env to send real SMS)\n`);
    return { delivered: false, mode: "console" };
  }

  try {
    await client.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
      body,
    });
    return { delivered: true, mode: "twilio" };
  } catch (error) {
    console.log("[sms] send failed:", error.message);
    throw error;
  }
}
