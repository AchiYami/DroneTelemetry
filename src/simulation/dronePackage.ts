import { randomLatitude, randomLongitude } from "../util/utils";

export interface DronePackage {
  packageId: string;
  recipientId: string;
  latitude: number;
  longitude: number;
}

export function generatePackage() {
  const newPackage = {
    packageId: crypto.randomUUID(),
    recipientId: crypto.randomUUID(),
    latitude: randomLatitude(),
    longitude: randomLongitude(),
  };

  return newPackage;
}
