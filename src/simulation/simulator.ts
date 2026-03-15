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

async function sendEvent(
  droneId: string,
  eventType: DroneEvent,
  telemetry: Record<string, unknown>,
) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        droneId,
        timestamp: new Date().toISOString(),
        eventType,
        telemetry,
      }),
    });
    console.log(`Drone [${droneId} :: Event :: ${eventType}]`);
  } catch (err) {
    console.error(
      `Drone [${droneId}] :: Error :: Failed to send event ${eventType}`,
      err,
    );
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
      //Add some leading zeroes to the start of the drone ID -- maybe remove this...?
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
