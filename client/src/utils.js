export const kes = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

export const shortDate = (d) =>
  new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

export const categoryLabel = {
  motor_vehicle: "Motor Vehicle",
  machinery: "Machinery",
  real_estate: "Real Estate / Land",
  industrial_equipment: "Industrial Equipment",
};

const when = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true };

// e.g. "Oct 16, 2026, 2:30 PM"
export const dateTime = (d) =>
  new Date(d).toLocaleString("en-US", { ...when, year: "numeric" });

// e.g. "Oct 16, 2:30 PM" (used on the catalog cards)
export const dateTimeShort = (d) => new Date(d).toLocaleString("en-US", when);

// e.g. "2:30:15 PM" (used in the bid activity feed)
export const timeOnly = (d) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });