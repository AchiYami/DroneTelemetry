import { ValidatedTelemetry } from "./validator";
import { ValidDroneTelemetry } from "../types/validDroneTelemetry";

export const transformer = {
    transform(raw: ValidatedTelemetry): ValidDroneTelemetry {
        return {
            droneId : raw.droneId,
            timestamp: new Date(raw.timestamp),
            eventType: raw.eventType,
            telemetry: raw.telemetry
        }
    }
}