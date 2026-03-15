import "dotenv/config";
import { Drone } from "./drone";

type DroneEvent =
  | "battery_log"
  | "delivery_received"
  | "delivery_begin"
  | "delivery_complete"
  | "delivery_failed"
  | "route_adjustment"
  | "shutdown";

const DRONE_COUNT = 25;
const API_URL =
  process.env.DRONE_CREATE_TELEMETRY_API ??
  "http://localhost:3000/createDroneTelemetry";

// Batch buffer per drone
const eventBuffer: Map<string, Record<string, unknown>[]> = new Map();
const BATCH_SIZE = 5; // send every 5 events

async function flushBatch(droneId: string) {
  const events = eventBuffer.get(droneId) ?? [];
  if (events.length === 0) return;

  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(events),
    });
    console.log(`Drone [${droneId}] :: Batched ${events.length} events`);
    eventBuffer.set(droneId, []);
  } catch (err) {
    console.error(`Drone [${droneId}] :: Error :: Failed to send batch:`, err);
  }
}

async function sendEvent(
  droneId: string,
  eventType: DroneEvent,
  telemetry: Record<string, unknown>,
) {
  const event = {
    droneId,
    timestamp: new Date().toISOString(),
    eventType,
    telemetry,
  };

  // Buffer the event
  const buffer = eventBuffer.get(droneId) ?? [];
  buffer.push(event);
  eventBuffer.set(droneId, buffer);

  // Flush when batch size reached
  if (buffer.length >= BATCH_SIZE) {
    await flushBatch(droneId);
  }
}

function attachListeners(drone: Drone) {
  const events: DroneEvent[] = [
    "battery_log",
    "delivery_received",
    "delivery_begin",
    "delivery_complete",
    "delivery_failed",
    "route_adjustment",
    "shutdown",
  ];

  //Add a listener for each event type
  events.forEach((eventType) => {
    drone.on(eventType, (telemetry: Record<string, unknown>) => {
      sendEvent(drone.droneId, eventType, telemetry);
    });
  });
}

function startSimulator() {
  console.log(`Starting Drone Simulation with ${DRONE_COUNT} drones.\n\n`);

  //Take each drone from the array
  Array.from(
    { length: DRONE_COUNT },
    (_, i) =>
      //Add some leading zeroes to the start of the drone ID
      `drone-${String(i + 1).padStart(2, "0")}`,
  ).forEach((droneId, index) => {
    setTimeout(() => {
      //Start the drone
      const drone = new Drone(droneId);
      attachListeners(drone);
      drone.start();
    }, index * 200);
  });
}

startSimulator();
