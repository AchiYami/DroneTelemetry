CREATE TABLE dead_letter_telemetry (
    id SERIAL PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_payload JSONB NOT NULL,
    failure_reason TEXT NOT NULL,
    drone_id VARCHAR(100),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_dead_letter_drone_id
ON dead_letter_telemetry(drone_id);

CREATE INDEX idx_dead_letter_unresolved
  ON dead_letter_telemetry(resolved)
  WHERE resolved = FALSE;