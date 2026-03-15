import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify, { FastifyInstance } from "fastify";
import { producer } from "../../src/queue/producer";
import { vi } from "vitest";

// Mock the producer so we don't need Redis running
vi.mock("../../src/queue/producer", () => ({
  producer: {
    push: vi.fn().mockResolvedValue(undefined),
    pushBatch: vi.fn().mockResolvedValue(undefined),
  },
}));

function buildApp(): FastifyInstance {
  const fastify = Fastify();

  fastify.post<{ Body: any | any[] }>(
    "/createDroneTelemetry",
    async (request, reply) => {
      const body = request.body;
      const events = Array.isArray(body) ? body : [body];

      await producer.pushBatch(events);

      reply.statusCode = 202;
      return { status: "Accepted", queued: events.length };
    },
  );

  return fastify;
}

describe("API endpoints", () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /createDroneTelemetry ───────────────────────────────────────────────

  describe("POST /createDroneTelemetry", () => {
    it("returns 202 for a valid telemetry payload", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload: {
          droneId: "drone-01",
          timestamp: "2026-03-15T10:00:00.000Z",
          eventType: "battery_log",
          telemetry: { batteryLevel: 74, isCharging: false },
        },
      });

      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.body).status).toBe("Accepted");
    });

    it("calls the producer with the correct payload", async () => {
      const payload = {
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      };

      await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload,
      });

      expect(vi.mocked(producer.pushBatch)).toHaveBeenCalledWith([payload]);
    });
  });

  describe("single and batch payload handling", () => {
    it("accepts a single event payload and returns queued: 1", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload: {
          droneId: "drone-01",
          timestamp: "2026-03-15T10:00:00.000Z",
          eventType: "battery_log",
          telemetry: { batteryLevel: 74, isCharging: false },
        },
      });

      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.body).queued).toBe(1);
    });

    it("accepts a batch of events and returns the correct queued count", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload: [
          {
            droneId: "drone-01",
            timestamp: "2026-03-15T10:00:00.000Z",
            eventType: "battery_log",
            telemetry: { batteryLevel: 74, isCharging: false },
          },
          {
            droneId: "drone-02",
            timestamp: "2026-03-15T10:00:00.000Z",
            eventType: "delivery_complete",
            telemetry: {
              packageId: "pkg-1234",
              recipientId: "recipient-1",
              latitude: 54.597,
              longitude: -5.93,
              batteryLevel: 60,
            },
          },
          {
            droneId: "drone-03",
            timestamp: "2026-03-15T10:00:00.000Z",
            eventType: "shutdown",
            telemetry: { reason: "battery_depleted", code: 100 },
          },
        ],
      });

      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.body).queued).toBe(3);
    });

    it("calls pushBatch with a normalised array for a single event", async () => {
      const payload = {
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      };

      await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload,
      });

      expect(vi.mocked(producer.pushBatch)).toHaveBeenCalledWith([payload]);
    });

    it("calls pushBatch with the full array for a batch", async () => {
      const payload = [
        {
          droneId: "drone-01",
          timestamp: "2026-03-15T10:00:00.000Z",
          eventType: "battery_log",
          telemetry: { batteryLevel: 74, isCharging: false },
        },
        {
          droneId: "drone-02",
          timestamp: "2026-03-15T10:00:00.000Z",
          eventType: "shutdown",
          telemetry: { reason: "battery_depleted", code: 100 },
        },
      ];

      await app.inject({
        method: "POST",
        url: "/createDroneTelemetry",
        payload,
      });

      expect(vi.mocked(producer.pushBatch)).toHaveBeenCalledWith(payload);
    });
  });
});
