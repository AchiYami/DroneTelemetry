import { describe, it, expect } from "vitest";
import { transformer } from "../../src/processing/transformer";
import { ValidatedTelemetry } from "../../src/processing/validator";

describe("transformer", () => {
  // ─── Timestamp Parsing ────────────────────────────────────────────────────────

  describe("timestamp", () => {
    it("converts a valid ISO timestamp string into a Date object", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      } as ValidatedTelemetry);

      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("preserves the correct timestamp value after parsing", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      } as ValidatedTelemetry);

      expect(result.timestamp.toISOString()).toBe("2026-03-15T10:00:00.000Z");
    });
  });

  // ─── Field Preservation ───────────────────────────────────────────────────────

  describe("field preservation", () => {
    it("preserves droneId unchanged", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      } as ValidatedTelemetry);

      expect(result.droneId).toBe("drone-01");
    });

    it("preserves eventType unchanged", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 74, isCharging: false },
      } as ValidatedTelemetry);

      expect(result.eventType).toBe("battery_log");
    });

    it("preserves telemetry payload unchanged", () => {
      const telemetry = { batteryLevel: 74, isCharging: false };

      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry,
      } as ValidatedTelemetry);

      expect(result.telemetry).toEqual(telemetry);
    });
  });

  // ─── Event Types ──────────────────────────────────────────────────────────────

  describe("event types", () => {
    it("correctly transforms a delivery_complete event", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "delivery_complete",
        telemetry: {
          packageId: "pkg-1234",
          recipientId: "recipient-1",
          latitude: 54.597,
          longitude: -5.93,
          batteryLevel: 60,
        },
      } as ValidatedTelemetry);

      expect(result.eventType).toBe("delivery_complete");
      expect(result.droneId).toBe("drone-01");
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("correctly transforms a route_adjustment event", () => {
      const result = transformer.transform({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "route_adjustment",
        telemetry: {
          previousRoute: "route-1",
          newRoute: "route-2",
          reason: "weather",
        },
      } as ValidatedTelemetry);

      expect(result.eventType).toBe("route_adjustment");
      expect(result.telemetry).toEqual({
        previousRoute: "route-1",
        newRoute: "route-2",
        reason: "weather",
      });
    });
  });
});
