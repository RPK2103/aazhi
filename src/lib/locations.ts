export const COASTAL_LOCATIONS = [
  {
    id: "chennai-kasimedu",
    name: "Chennai / Kasimedu",
    latitude: 13.125,
    longitude: 80.3,
  },
  {
    id: "kochi",
    name: "Kochi",
    latitude: 9.9312,
    longitude: 76.2673,
  },
  {
    id: "mangaluru",
    name: "Mangaluru",
    latitude: 12.9141,
    longitude: 74.856,
  },
] as const;

export type LocationId = (typeof COASTAL_LOCATIONS)[number]["id"];

export function getLocation(id: string) {
  return COASTAL_LOCATIONS.find((location) => location.id === id);
}
