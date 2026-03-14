CREATE TABLE drone_telemetry (
    id  SERIAL PRIMARY KEY, -- ID for the record
    drone_id VARCHAR(100) NOT NULL, -- ID of the reporting drone
    event_type VARCHAR(100) NOT NULL, -- Which kind of report is this? 
    timestamp TIMESTAMPTZ NOT NULL, -- Timestamp of the report
    telemetry JSONB NOT NULL, -- Additional data, battery level etc, schemaless. 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Meta timestamp, when was it created in the DB 
);

CREATE INDEX idx_telemetry_drone_id 
  ON drone_telemetry(drone_id);

CREATE INDEX idx_telemetry_event_type 
  ON drone_telemetry(event_type);

CREATE INDEX idx_telemetry_timestamp 
  ON drone_telemetry(timestamp DESC);

CREATE INDEX idx_telemetry_payload 
  ON drone_telemetry USING GIN(telemetry jsonb_path_ops);