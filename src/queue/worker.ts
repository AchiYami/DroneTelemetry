import { Worker } from "bullmq";
import "dotenv/config";
import { RawDroneTelemetry } from "../types/rawDroneTelemetry";
import { droneTelemetryRepository } from "../db/droneTelemetry.repository";
import { deadLetterRepository } from "../db/deadLetter.repository";
import { validate } from "../processing/validator";
import { transformer } from "../processing/transformer";

export const createWorker = () => {
  const worker = new Worker(
    "telemetry",
    async (job) => {
      const raw = job.data as RawDroneTelemetry;

      const result = validate(raw);

      if (!result.valid) {
        await deadLetterRepository.createDeadLetterEntry({
          rawPayload: raw,
          failureReason: result.reason,
          droneId: raw.droneId ?? null,
          receivedAt: new Date(),
        });

        return;
      }

      const event = transformer.transform(result.data);
      await droneTelemetryRepository.createTelemetryEntry(event);
    },
    {
      connection: {
        url: process.env.REDIS_URL,
      },
    },
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Job ${job?.id} failed: ${error.message}`);
  });

  return worker;
};
