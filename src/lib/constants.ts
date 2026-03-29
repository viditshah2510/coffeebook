export const PROFILES = [
  { id: "karan", name: "Karan", initials: "K", color: "#d4a12a" },
  { id: "vidit", name: "Vidit", initials: "V", color: "#0e4444" },
  { id: "amar", name: "Amar", initials: "A", color: "#76553c" },
] as const;

export const ROAST_LEVELS = [
  { value: "light", label: "Light", color: "#c4956a" },
  { value: "medium", label: "Medium", color: "#8b5e3c" },
  { value: "medium-dark", label: "Medium Dark", color: "#5c3a1e" },
  { value: "dark", label: "Dark", color: "#2c1810" },
] as const;

export type ProfileId = (typeof PROFILES)[number]["id"];
export type RoastLevel = (typeof ROAST_LEVELS)[number]["value"];
