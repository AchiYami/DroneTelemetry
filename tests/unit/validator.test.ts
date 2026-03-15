import { describe, it, expect } from "vitest";
import { validate } from "../../src/processing/validator";

describe("validator", () => {
  // ─── Battery Log ─────────────────────────────────────────────────────────────

  describe("battery_log", () => {
    it("accepts a valid battery log event", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: {
          batteryLevel: 74,
        },
      });

      expect(result.valid).toBe(true);
    });

    it("rejects a battery level above 100", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: {
          batteryLevel: 150,
        },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("batteryLevel");
      }
    });

    it("rejects a battery level below 0", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: {
          batteryLevel: -1,
        },
      });

      expect(result.valid).toBe(false);
    });
  });

  // ─── Delivery Events ──────────────────────────────────────────────────────────

  describe("delivery_complete", () => {
    it("accepts a valid delivery complete event", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "delivery_complete",
        telemetry: {
          batteryLevel: 50,
          packageId: "pkg-1234",
          recipientId: "recipient-1",
          latitude: 54.597,
          longitude: -5.93,
        },
      });

      expect(result.valid).toBe(true);
    });

    it("rejects an invalid latitude", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "delivery_complete",
        telemetry: {
          packageId: "pkg-1234",
          recipientId: "recipient-1",
          latitude: 999, // invalid
          longitude: -5.93,
        },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("latitude");
      }
    });

    it("rejects a missing packageId", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "delivery_complete",
        telemetry: {
          recipientId: "recipient-1",
          latitude: 54.597,
          longitude: -5.93,
        },
      });

      expect(result.valid).toBe(false);
    });
  });

  // ─── Route Adjustment ─────────────────────────────────────────────────────────

  describe("route_adjustment", () => {
    it("accepts a valid route adjustment event", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "route_adjustment",
        telemetry: {
          previousRoute: "route-1",
          newRoute: "route-2",
          reason: "weather",
        },
      });

      expect(result.valid).toBe(true);
    });

    it("rejects an invalid route adjustment reason", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "route_adjustment",
        telemetry: {
          previousRoute: "route-1",
          newRoute: "route-2",
          reason: "alien_invasion", // not in enum
        },
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain("reason");
      }
    });
  });

  // ─── Common Validation ────────────────────────────────────────────────────────

  describe("common fields", () => {
    it("rejects a missing droneId", () => {
      const result = validate({
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 50 },
      });

      expect(result.valid).toBe(false);
    });

    it("rejects an empty droneId", () => {
      const result = validate({
        droneId: "",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "battery_log",
        telemetry: { batteryLevel: 50 },
      });

      expect(result.valid).toBe(false);
    });

    it("rejects an unknown event type", () => {
      const result = validate({
        droneId: "drone-01",
        timestamp: "2026-03-15T10:00:00.000Z",
        eventType: "self_destruct",
        telemetry: {},
      });

      expect(result.valid).toBe(false);
    });

    it("rejects a completely empty payload", () => {
      const result = validate({});

      expect(result.valid).toBe(false);
    });
  });
});
