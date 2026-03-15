import "dotenv/config";
import Fastify from "fastify";
import { RawDroneTelemetry } from "./types/rawDroneTelemetry";
import { droneTelemetryRepository } from "./db/droneTelemetry.repository";
import { deadLetterRepository } from "./db/deadLetter.repository";
import { producer } from "./queue/producer";
import { createWorker } from "./queue/worker";

//Create the worker
createWorker();

//Initialize Fastify
const fastify = Fastify({
  logger: true,
});

// Get Drone Telemtry by Drone ID
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
      return { status: `Error :: No results were found for Drone ${droneId}` };
    }

    reply.statusCode = 200;
    return { count: results.length, results };
  },
);

//Create Drone Telemetry
fastify.post<{ Body: RawDroneTelemetry }>(
  "/createDroneTelemetry",
  async function handler(request, reply) {
    const telemetry = request.body;

    //Make the data into an array if it isn't - normalises
    const events = Array.isArray(telemetry) ? telemetry : [telemetry];

    await producer.pushBatch(events);

    reply.statusCode = 202;
    return {
      status: "Accepted",
      queued: events.length,
    };
  },
);

//Get all Dead letter telemetry
fastify.get("/deadLetter/", async function handler(request, reply) {
  const results = await deadLetterRepository.getUnresolvedDeadLetterEntries();

  if (results.length === 0) {
    reply.statusCode = 404;
    return { status: "Error :: No dead letter entries have been found." };
  }

  return { count: results.length, results };
});

//Mark dead letter entry as resolved
fastify.put<{ Params: { id: number }; Body: { notes: string | undefined } }>(
  "/deadLetter/:id/resolve",
  async function handler(request, reply) {
    const { id } = request.params;
    const notes = request.body.notes;

    if (id === null || id === undefined || id < 1) {
      reply.statusCode = 500;
      return {
        status:
          "Error :: Invalid Dead Letter ID supplied. ID must be not null and greater than 0",
      };
    }

    deadLetterRepository.markDeadLetterEntryAsResolved(id, notes);
    reply.statusCode = 200;

    return {
      status: `Success :: Dead Letter Entry ${id} has been marked as resolved.`,
    };
  },
);

//Start the service
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
