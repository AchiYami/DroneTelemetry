import { DroneEventType } from "./droneEventType";

/**
 * This is a representation of the drone telemetry after it has been validated
 */
export interface ValidDroneTelemetry {
  droneId: string;
  timestamp: Date;
  eventType: DroneEventType;
  payload: Record<string, unknown>;
}
