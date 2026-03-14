import pool from "./dbClient";
import { ValidDroneTelemetry } from "../types/validDroneTelemetry";

export const droneTelemetryRepository = {

    /**
     * Saves a validated drone telemetry event to the database 
     * @param telemetry - the contents of the telemetry event
     */
  async createTelemetryEntry(telemetry: ValidDroneTelemetry): Promise<void> {
    await pool.query(
      `INSERT INTO drone_telemetry
        (drone_id, event_type, timestamp, telemetry)
       VALUES ($1, $2, $3, $4)`,
      [
        telemetry.droneId,
        telemetry.eventType,
        telemetry.timestamp,
        JSON.stringify(telemetry.telemetry),
      ],
    );
  },
};
