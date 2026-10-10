// A User-Agent cannot tell a laptop from a desktop, so the browser supplies a
// hint to the server. Devices that expose a battery are treated as laptops.
let cachedHint: "Laptop" | "Desktop" = "Desktop";

if (typeof navigator !== "undefined") {
  const battery = (navigator as any).getBattery?.();
  battery
    ?.then((b: any) => {
      if (typeof b?.level === "number") cachedHint = "Laptop";
    })
    ?.catch?.(() => {});
}

export function getDeviceHint(): "Laptop" | "Desktop" | "Mobile" {
  if (typeof navigator === "undefined") return "Desktop";
  if (/android|iphone|ipod|mobile/i.test(navigator.userAgent)) return "Mobile";
  return cachedHint;
}
