import "dotenv/config";
import Fastify from "fastify";
import pool from "./db/dbClient";
import { RawDroneTelemetry } from "./types/rawDroneTelemetry";
import { droneTelemetryRepository } from "./db/droneTelemetry.repository";
import { ValidDroneTelemetry } from "./types/validDroneTelemetry";
import { deadLetterRepository } from "./db/deadLetter.repository";
import { DeadLetterEntry } from "./types/deadLetterTelemetry";

const fastify = Fastify({
  logger: true,
});

fastify.get("/", async function handler(request, reply) {
  return "Hello World!";
});

fastify.get("/testConnection", async function handler(request, reply) {
  const db = pool;

  return `Database Connection String: ${db.options.connectionString}`;
});

fastify.get<{ Params: { droneId: string } }>(
  "/droneTelemetry/:droneId",
  async function handler(request, reply) {
    const { droneId } = request.params;

    if (droneId === null || droneId === undefined) {
      reply.statusCode = 400;
      return { status: "Error :: No Drone ID was provided." };
    }

    const results =
      await droneTelemetryRepository.getTelemetryByDroneId(droneId);

    if (results.length === 0) {
      reply.statusCode = 404;
      return { status: `Error :: No results were found for Drone ${droneId}`};
    }

    reply.statusCode = 200;
    return { count: results.length, results };
  },
);

fastify.post<{ Body: RawDroneTelemetry }>(
  "/createDroneTelemetry",
  async function handler(request, reply) {
    const telemetry = request.body;

    if (
      telemetry.droneId === null ||
      telemetry.droneId === undefined ||
      telemetry.droneId.length === 0
    ) {
      //Internal logging
      fastify.log.error("Error :: Drone has no ID");

      //add to dead letter table
      const deadLetter: DeadLetterEntry = {
        droneId: "unknown",
        failureReason: "Missing Drone ID",
        rawPayload: JSON.stringify(telemetry),
        receivedAt: new Date(),
      };
      deadLetterRepository.createDeadLetterEntry(deadLetter);

      //User error
      reply.statusCode = 400;
      return { status: "Error :: Drone has no ID." };
    }

    const validatedTelemetry: ValidDroneTelemetry = {
      droneId: telemetry.droneId,
      timestamp: new Date(telemetry.timestamp),
      eventType: telemetry.eventType,
      telemetry: telemetry.telemetry,
    };

    droneTelemetryRepository.createTelemetryEntry(validatedTelemetry);
  },
);

fastify.get<{ Params: { droneId: string | null } }>(
  "/deadLetter/droneId/:droneId",
  async function handler(request, reply) {
    let { droneId } = request.params;

    //Allow for the potential of an empty droneId parameter to return any
    //entries with missing drone IDs
    if (droneId === null || droneId === undefined || droneId.length === 0) {
      droneId = "unknown";
    }

    console.log("Drone ID is:", droneId);

    const results =
      await deadLetterRepository.getDeadLetterEntryByDroneId(droneId);

    if (results.length === 0) {
      reply.statusCode = 404;
      return {
        status: `Error :: No dead letter results were found for Drone ${droneId}`,
      };
    }

    reply.statusCode = 200;
    return { count: results.length, results };
  },
);

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
