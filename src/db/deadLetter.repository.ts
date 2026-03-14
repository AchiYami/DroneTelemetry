import pool from "./dbClient";
import { DeadLetterEntry } from "../types/deadLetterTelemetry";

//TODO:: Add the ability to mark a dead letter event as 'investigated'/'resolved
//TODO:: Find Dead Letters by Drone ID
//TODO:: Find Dead Letters by Unresolved

export const deadLetterRepository = {
  async createDeadLetterEntry(telemetry: DeadLetterEntry): Promise<void> {
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
  },

  async getDeadLetterEntryByDroneId(droneId: string | null, limit = 100) {
    const result = await pool.query(
      `SELECT * from dead_letter_telemetry where drone_id = $1 ORDER BY received_at DESC LIMIT $2`,
      [droneId, limit],
    );

    return result.rows;
  },

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
