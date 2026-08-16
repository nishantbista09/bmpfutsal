export const VENUE = {
  name: "BMP Futsal",
  tagline: "Book your pitch. Bring your squad. Play under the lights.",
  phone: "+977 9851086037",
  phoneAlt: "+977 9841392404",
  email: "bmpfutsal@gmail.com",
  address: "BMP Futsal Ground, Lalitpur, Nepal",
  mapsUrl: "https://maps.app.goo.gl/zCTah6x5aLZyyvnTA",
  mapsEmbed:
    "https://www.google.com/maps?q=27.7172,85.3240&z=15&output=embed",
  openFrom: 6,
  openTo: 20,
  currency: "Rs.",
} as const;

export const PAYMENT_METHODS = [
  { id: "esewa", label: "eSewa", hint: "Send to eSewa 9851086037 (BMP Futsal)" },
  { id: "khalti", label: "Khalti", hint: "Send to Khalti 9851086037 (BMP Futsal)" },
  { id: "fonepay", label: "Fonepay QR", hint: "Scan Fonepay QR — BMP Futsal" },
] as const;

export function formatMoney(amount: number) {
  return `${VENUE.currency} ${Number(amount).toLocaleString("en-IN")}`;
}

export function formatHour(hour: number) {
  const h = ((hour + 11) % 12) + 1;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${h}:00 ${suffix}`;
}

export function timeString(hour: number) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

export function formatTimeLabel(time: string) {
  const hour = Number(time.slice(0, 2));
  return formatHour(hour);
}

export function todayISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export function prettyDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
