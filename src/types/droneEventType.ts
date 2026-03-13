/**
 * Potential event types for a drone to emit
 */
export type DroneEventType =
  | "battery_log"
  | "delivery_begin"
  | "delivery_complete"
  | "delivery_failed"
  | "route_adjustment"
  | "shutdown";
