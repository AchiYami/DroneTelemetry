import "dotenv/config";
import { EventEmitter } from "events";
import { getRandomInt } from "../util/utils";
import { DronePackage, generatePackage } from "./dronePackage";

const BATTERY_DRAIN_RATE = 5;
const BATTERY_WARNING_LEVEL = 20;

//Traffic is a deliberate error - used to simulate bad data hitting the pipeline, and
//allowing the dead letter process to take over.
const ROUTE_ADJUSTMENT_REASON = ["weather", "obstacle", "battery", "traffic"];

type DroneState =
  | "idle"
  | "delivery_received"
  | "delivery_begin"
  | "delivery_complete"
  | "delivery_failed"
  | "shutdown";

export class Drone extends EventEmitter {
  readonly droneId: string;
  private state: DroneState = "idle";
  private batteryLevel: number;
  private hasFiredBatteryWarning = false;
  private currentPackage: DronePackage | null = null;

  constructor(droneId: string) {
    super();
    this.droneId = droneId;
    this.batteryLevel = getRandomInt(50, 100);
  }

  start() {
    console.log(
      `Drone [${this.droneId}] ONLINE :: Battery Level [${this.batteryLevel}%]`,
    );
    setTimeout(() => this.tick(), getRandomInt(5, 10));
  }

  private tick() {
    //Simulate Battery Draining
    this.drainBattery();

    //Check for Shutdown
    if (this.batteryLevel <= 0) {
      this.state = "shutdown";
      this.emit("shutdown", { reason: "battery_depleted"});
      console.log(`Drone [${this.droneId}] :: Shutdown :: Battery Depleted.`);

      //Early return - drone is finished
      return;
    }

    //Simulate State Change
    this.changeState();

    //If we haven't shut down, reset the timer
    if (this.state !== "shutdown") {
      setTimeout(() => this.tick(), getRandomInt(5, 10));
    }
  }

  private drainBattery() {
    //Drain the battery level
    this.batteryLevel = Math.max(0, this.batteryLevel - BATTERY_DRAIN_RATE);

    //Check for low battery warning
    //check if we have already sent the low battery event to prevent spam
    if (
      this.batteryLevel <= BATTERY_WARNING_LEVEL &&
      !this.hasFiredBatteryWarning
    ) {
      this.hasFiredBatteryWarning = true;
      this.emit("battery_log", {
        batteryLevel: this.batteryLevel,
      });
    }
  }

  private changeState() {
    //Assumed possible states
    // Idle - The drone is at rest.
    // Delivery Received - The drone has received a new delivery for it's route
    // Delivery Begin    - The drone has chosen to deliver the next parcel
    //                   - During this state the drone can detect a need to adjust it's route
    //                   - During this state the drone can fail to deliver
    //                   - During this tate the drone can complete it's delivery
    // Delivery Fail     - The drone reports a failure and returns to idle
    // Delivery Complete - The drone reports a completed delivery and returns to idle

    switch (this.state) {
      case "idle": {
        this.currentPackage = generatePackage();
        this.state = "delivery_received";
        this.emit("delivery_received", {
          ...this.currentPackage,
          batteryLevel: this.batteryLevel,
        });
        break;
      }

      case "delivery_received": {
        this.state = "delivery_begin";
        this.emit("delivery_begin", {
          ...this.currentPackage,
          batteryLevel: this.batteryLevel,
        });
        break;
      }

      case "delivery_begin": {
        //Simulate random chance
        const roll = Math.random();

        //10% chance of random failure
        if (roll < 0.1) {
          this.state = "delivery_failed";
          this.emit("delivery_failed", {
            ...this.currentPackage,
            batteryLevel: this.batteryLevel,
            reason: "impassable_obstacle",
          });
          //10% chance of route adjustment
        } else if (roll < 0.2) {
          this.emit("route_adjustment", {
            //For simplicity's sake, we'll not do any checking to ensure
            //we don't 'change' from route 6 to route 6 for example
            previousRoute: `route-${getRandomInt(1, 66)}`,
            newRoute: `route-${getRandomInt(1, 66)}`,
            reason:
              ROUTE_ADJUSTMENT_REASON[
                getRandomInt(0, ROUTE_ADJUSTMENT_REASON.length)
              ],
          });
        } else {
          this.state = "delivery_complete";
          this.emit("delivery_complete", {
            ...this.currentPackage,
            batteryLevel: this.batteryLevel,
          });
        }
        break;
      }

      case "delivery_complete":
      case "delivery_failed": {
        this.state = "idle";
        this.currentPackage = null;
        break;
      }
    }
  }
}
