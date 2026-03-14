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
};
