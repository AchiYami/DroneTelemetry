import { Queue } from "bullmq";
import "dotenv/config";
import { RawDroneTelemetry } from "../types/rawDroneTelemetry";

const telemetryQueue = new Queue("telemetry", {
  connection: {
    url: process.env.REDIS_URL,
  },
});

export const producer = {
  async push(event: RawDroneTelemetry): Promise<void> {
    await telemetryQueue.add("telemetry_event", event, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    });
  },
};
