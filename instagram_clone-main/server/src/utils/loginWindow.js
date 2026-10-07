// Business rule: logins from a MOBILE device are only permitted between
// 10:00 AM and 1:00 PM *server time* (the machine's local clock — NOT IST, per
// the requirement's wording "server time"). Desktop logins are unrestricted.

export const LOGIN_WINDOW_START_HOUR = 10; // 10:00 AM (inclusive)
export const LOGIN_WINDOW_END_HOUR = 13; // 1:00 PM (exclusive)

export function isWithinLoginWindow(date = new Date()) {
  const hour = date.getHours(); // server local hour
  return hour >= LOGIN_WINDOW_START_HOUR && hour < LOGIN_WINDOW_END_HOUR;
}

export function loginWindowLabel() {
  return "10:00 AM and 1:00 PM (server time)";
}

export const LOGIN_WINDOW_CLOSED_MESSAGE = `Mobile logins are only allowed between ${loginWindowLabel()}. Please try again during that window.`;
