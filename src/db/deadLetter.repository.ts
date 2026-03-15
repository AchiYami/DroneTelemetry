import pool from "./dbClient";
import { DeadLetterEntry } from "../types/deadLetterTelemetry";

export const deadLetterRepository = {
  /**
   * Creates a Dead Letter Entry for an attempted drone telemetry payload.
   * @param telemetry - the dead letter entry to save
   */
  async createDeadLetterEntry(telemetry: DeadLetterEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT into dead_letter_telemetry
            (raw_payload, failure_reason, drone_id, received_at)
            VALUES ($1, $2, $3, $4)`,
        [
          JSON.stringify(telemetry.rawPayload),
          telemetry.failureReason,
          telemetry.droneId,
          telemetry.receivedAt,
        ],
      );
    } catch (err) {
      //Log out error
      console.error(
        `Error :: Failed to insert dead letter for Drone [${telemetry.droneId ?? "unknown"}]:`,
        err,
      );

      //Throw again so the worker handles it
      throw err;
    }
  },

  /**
   * Retrieves all dead letter entries for a given drone ID.
   * @param droneId - The ID of the drone to filter by, leave empty or 'unknown' to search for bad drone IDs
   * @param limit - the maximum amount of rows to return in one go
   * @returns A list of dead letter entries with a given drone id
   */
  async getDeadLetterEntryByDroneId(droneId: string | null, limit = 100) {
    const result = await pool.query(
      `SELECT * from dead_letter_telemetry where drone_id = $1 ORDER BY received_at DESC LIMIT $2`,
      [droneId, limit],
    );

    return result.rows;
  },

  /**
   * Retrieves all unresolved dead letter entries.
   * @returns A list of all dead letter entries where resolved is false
   */
  async getUnresolvedDeadLetterEntries() {
    const result = await pool.query(
      `SELECT * from dead_letter_telemetry where resolved = false`,
    );
    return result.rows;
  },

  /**
   * Marks a dead letter entry as resolved, and records any notes against it.
   * @param id The ID of the Dead Letter Entry to resolve
   * @param notes Notes to go against the entry (optional)
   */
  async markDeadLetterEntryAsResolved(
    id: number,
    notes?: string,
  ): Promise<void> {
    await pool.query(
      `UPDATE dead_letter_telemetry
            SET resolved = TRUE,
                resolved_at = NOW(),
                notes = $2
            WHERE id = $1`,
      [id, notes ?? null],
    );
  },
};
