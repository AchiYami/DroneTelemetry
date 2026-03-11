CREATE TABLE drone_telemetry (
    id  SERIAL PRIMARY KEY, -- ID for the record
    drone_id VARCHAR(100) NOT NULL, -- ID of the reporting drone
    event_type VARCHAR(100) NOT NULL, -- Which kind of report is this? 
    timestamp TIMESTAMPTZ NOT NULL, -- Timestamp of the report
    telemetry JSONB NOT NULL, -- Additional data, battery level etc, schemaless. 
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() -- Meta timestamp, when was it created in the DB 
)