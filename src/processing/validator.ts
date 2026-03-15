import { z } from "zod";

//Validate a routine battery check event
const BatteryLevelSchema = z.object({
  batteryLevel: z.number().min(0).max(100),
});

//Validate a delivery event
const DeliveryPayloadSchema = z.object({
  batteryLevel: z.number(),
  packageId: z.string(),
  recipientId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  reason: z.string().optional(),
});


//Validate a route adjustment event
const RouteAdjustmentSchema = z.object({
  previousRoute: z.string(),
  newRoute: z.string(),
  reason: z.enum(["weather", "obstacle", "battery"]),
});

//Validate a shutdown event
const ShutdownSchema = z.object({
  reason: z.enum(["route_complete", "maintenance", "unexpected"]),
});

const TelemetrySchema = z.discriminatedUnion("eventType", [
  //battery updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("battery_log"),
    telemetry: BatteryLevelSchema,
  }),
  //delivery updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("delivery_received"),
    telemetry: DeliveryPayloadSchema,
  }),
  //delivery updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("delivery_begin"),
    telemetry: DeliveryPayloadSchema,
  }),
  //delivery updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("delivery_complete"),
    telemetry: DeliveryPayloadSchema,
  }),
  //delivery updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("delivery_failed"),
    telemetry: DeliveryPayloadSchema,
  }),
  //route adjustment updates
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("route_adjustment"),
    telemetry: RouteAdjustmentSchema,
  }),
  //shutdown event
  z.object({
    droneId: z.string().min(1),
    timestamp: z.string(),
    eventType: z.literal("shutdown"),
    telemetry: ShutdownSchema,
  }),
]);

export type ValidatedTelemetry = z.infer<typeof TelemetrySchema>;

export type ValidationResult =
  | { valid: true; data: ValidatedTelemetry }
  | { valid: false; reason: string; raw: unknown };

//Perform the validation
export function validate(raw: unknown): ValidationResult {
  const result = TelemetrySchema.safeParse(raw);

  //If true, we return the invalid data
  if (result.success) {
    return { valid: true, data: result.data };
  }

  //Or return the error reason
  return {
    valid: false,
    reason: result.error.issues
      .map((x) => `${x.path.join(".")} ${x.message}`)
      .join(`, `),
    raw,
  };
}
