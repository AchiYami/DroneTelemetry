import { DroneEventType } from "./droneEventType";

/**
 * This is a representation of the drone telemetry as it is received before validation takes place
 */
export interface RawDroneTelemetry {
  droneId: string;
  timestamp: string;
  eventType: DroneEventType;
  payload: Record<string, unknown>; //Unknown is type-safe version of 'any'
}
