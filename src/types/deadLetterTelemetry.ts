
/**
 * Representation of a 'Dead Letter' entry for the database
 */
export interface DeadLetterEntry {
  rawPayload: unknown; //Kept to unknown in case it fails validation
  failureReason: string;
  droneId: string | null; //Allow null in case of missing drone ID is the reason
  receivedAt: Date;
}
