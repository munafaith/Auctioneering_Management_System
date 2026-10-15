export const kes = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;

export const shortDate = (d) =>
  new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });

export const categoryLabel = {
  motor_vehicle: "Motor Vehicle",
  machinery: "Machinery",
  real_estate: "Real Estate / Land",
  industrial_equipment: "Industrial Equipment",
};