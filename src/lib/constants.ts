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

export const BREW_TYPES = [
  { value: "espresso", label: "Espresso" },
  { value: "americano", label: "Americano" },
  { value: "pour-over", label: "Pour Over" },
  { value: "french-press", label: "French Press" },
  { value: "aeropress", label: "AeroPress" },
  { value: "cold-brew", label: "Cold Brew" },
  { value: "moka-pot", label: "Moka Pot" },
  { value: "filter", label: "Filter" },
] as const;

export const PROCESS_METHODS = [
  { value: "washed", label: "Washed" },
  { value: "natural", label: "Natural" },
  { value: "anaerobic", label: "Anaerobic" },
  { value: "honey", label: "Honey" },
  { value: "permaculture", label: "Permaculture" },
] as const;

export type ProfileId = (typeof PROFILES)[number]["id"];
export type RoastLevel = (typeof ROAST_LEVELS)[number]["value"];
export type BrewType = (typeof BREW_TYPES)[number]["value"];
