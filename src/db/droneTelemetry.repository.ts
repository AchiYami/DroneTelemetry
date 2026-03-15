import pool from "./dbClient";
import { ValidDroneTelemetry } from "../types/validDroneTelemetry";

export const droneTelemetryRepository = {
  /**
   * Saves a validated drone telemetry event to the database
   * @param telemetry - the contents of the telemetry event
   */
  async createTelemetryEntry(telemetry: ValidDroneTelemetry): Promise<void> {
    try {
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
    } catch (err) {
      //Log out error
      console.error(
        `Error :: Failed to insert telemetry for Drone [${telemetry.droneId}]:`,
        err,
      );

      //Throw again so the worker handles it
      throw err;
    }
  },

  /**
   *
   * @param droneId - ID of the Drone to filter events by
   * @param limit - the maximum number of events to return (100 default)
   * @returns database entries that contain the given drone id
   */
  async getTelemetryByDroneId(droneId: string, limit = 100) {
    const result = await pool.query(
      `SELECT * FROM drone_telemetry 
      WHERE drone_id = $1 
      ORDER BY timestamp DESC
      LIMIT $2`,
      [droneId, limit],
    );

    return result.rows;
  },
};
