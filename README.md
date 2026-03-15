
A TypeScript event-driven pipeline for ingesting, validating, and storing telemetry data from a fleet of autonomous delivery drones.

## Overview

This system ingests a continuous stream of telemetry events from a fleet of delivery drones as they arrive, it then validates and transforms the data, after which it will then store it in a database.

Any malformed, corrupt or bad data is stored in a separate dead letter table, for later analysis, with the options to mark as resolved. 

## Architecture

<<IMAGE OF ARCHITECTURE>>

### Drone Simulator
Each drone is modelled as a state machine using Node's built-in `EventEmitter`. 

Drones are designed to randomly switch states, and emit an event upon reaching their new state, rather than directly call the API. This decouples the drone from the API, so that the Drone only cares about what *it* needs to do, it doesn't need to know anything about the API layer.

This also allows us to add more layers into the system at a later date that can just subscribe listeners to the drones events, rather than having to tell the drone to send information to this new system. 

**Potential Drone Events**
- "battery_log"
- "delivery_received"
- "delivery_begin"
- "delivery_complete"
- "delivery_failed"
- "route_adjustment"
	- Route Adjustment contains deliberate bad data, if a drone ever chooses "traffic" as the reason, this is to ensure the dead letter queue functions during the simulation (though due to the random nature of the simulator, this option is not guaranteed to appear during any single run)
- "shutdown"

**Potential Drone States:**
- Idle
	- The drone is at rest.
- Delivery Received: 
	     - The drone has received a new delivery for it's route
- Delivery Begin    
	- The drone has chosen to deliver the next parcel
	- During this state the drone can detect a need to adjust it's route
	- During this state the drone can fail to deliver
	- During this state the drone can complete it's delivery
- Delivery Failure     
	- The drone reports a failure and returns to idle
- Delivery Complete
	- The drone reports a completed delivery and returns to idle

**Default Settings:** (src/simulation/simulator.ts)
- 25 Drones (DRONE_COUNT)
- Batches events in groups of 5 (BATCH_SIZE)

### API Frameworks
**Frameworks Considered:** 
- Fastify (https://fastify.dev/)
- Express (https://expressjs.com/)

**Framework Chosen:** 
- Fastify 

**Reason:** I chose Fastify for its native TypeScript support and significantly higher throughput than Express. 

Although this implementation stays at a basic level,  the idea is that this system would scale as the drone fleet grows, which means that a higher throughput will result in a more robust and resilient system.

### Asynchronous Processing / Queue

**Frameworks Considered:**
- Kafka (https://kafka.apache.org/)
- RabbitMQ (https://www.rabbitmq.com/)
- BullMQ (https://bullmq.io/)

**Reason:**
I chose BullMQ over Kafka and RabbitMQ, as a (assumed) city-scale drone fleet generates thousands of events per second at most — well within BullMQ's capabilities. 

Kafka would be the right call if we needed a massive throughput, but considering the assumed scale of this system, adding in the complexity that comes with Kafka would be unnecessary. 

**Functionality:**
The API immediately returns `202 Accepted` and pushes events to a BullMQ queue backed by Redis. 

A separate worker process consumes jobs from the queue asynchronously. 

This gives us a decoupled system in which:
- The API can absorb traffic spikes without overwhelming the database
- Jobs stay in the queue until acknowledged, which keeps us safe in the event a worker crashes.
- Retries are handled automatically


### Database

**Databases Considered:** 
- MongoDB (https://www.mongodb.com/)
- PostgreSQL (https://www.postgresql.org/)

**Database Chosen:**
- PostgreSQL

**Reason:**
Both MongoDB and PostgreSQL (with it's JSONB columns) would support the differing shapes of date (for example, a battery log event should look nothing like a delivery complete event), PostgreSQL let's us keep columns like the Drone ID, Event Type & Timestamps structured.

This is helpful to us because the requirements specifically mention analysis and monitoring, here a SQL database would outperform a NoSQL database like MongoDB.

That being said, depending on the scaling strategy for this system, MongoDB may be better as it deals with horizontal scaling better than Postgres would. (https://www.mongodb.com/resources/basics/scaling)

### Validation 

**Frameworks Considered:** 
- Zod (https://zod.dev/)
- simple-runtypes (https://www.npmjs.com/package/simple-runtypes)

**Reason:**

I chose Zod for a few reasons:
- Zod has a integration with fastify with 'fastify-type-provider-zod' (https://www.npmjs.com/package/fastify-type-provider-zod?activeTab=code) 

- Zod can use discriminated unions, which let's us create an almost branch like structure for it's validation. (See src/processing/validator.ts). This let me combine multiple valid payload schemas under one umbrella schema. 

- Zod gives back structured error messages, whenever something fails validation, it returns the path to the data, in a nice easily readable format 

```
payload.batteryLevel: Number must be less than or equal to 100
```

**Dead Letter Table**
For telemetry that failed validation, I didn't want to simply discard them, or just create a log. 
They are written to a dead letter table with the raw payload and the reason that it failed validation. 

This means a drone that is beginning to malfunction can be tracked, and logs of both it's valid and invalid payloads can be inspected. Once an investigation is complete, they can be marked as resolved. 


---

## Getting Started

### Prerequisites

- Node.js 20+ (https://nodejs.org/en)
- Docker Desktop (https://www.docker.com/products/docker-desktop/)

### Installation
```bash
git clone https://github.com/AchiYami/DroneTelemetry
cd drone-telemetry
npm install
```

### Environment setup

Create a `.env` file in the project root:
```bash
DATABASE_URL=postgresql://sc_user:sc_password@localhost:5433/drone_telemetry
REDIS_URL=redis://localhost:6379
PORT=3000
```

### Build the Docker Containers
```bash
docker compose up -d
```

This starts Postgres and Redis containers. 
Database migrations run automatically on first boot.

(Optional) To destroy the containers and wipe the database:
```bash
docker compose down -v
```

### Start the API Locally
```bash
npm run dev
```

### Run the drone simulator

In a separate terminal:
```bash
npm run simulate
```

This starts the simulator, and will create 25 drones (by default), and have them run through their lifecycle, randomly changing their state and sending events. 

---

## API Reference

### `POST /createDroneTelemetry`

This API endpoint can accept either a single telemetry event, or a batched event. 
The API will return a '202 Accepted' response immediately, as it hands the processing off to the queue to happen asynchronously. 

*See Support Event Types for valid values for "eventType"*

**Example Requests**;
`POST localhost:3000/createDroneTelemetry`

Use an example below for the request body:

**Single Valid Telemetry Payload:**
```json
{
  "droneId": "drone-01",
  "timestamp": "2026-03-15T10:00:00.000Z",
  "eventType": "battery_log",
  "telemetry": {
    "batteryLevel": 74,
  }
}
```

**Batch Valid Telemetry Payload:**
```json
[
  {
    "droneId": "drone-01",
    "timestamp": "2026-03-15T10:00:00.000Z",
    "eventType": "battery_log",
    "telemetry": { "batteryLevel": 74 }
  },
  {
    "droneId": "drone-02",
    "timestamp": "2026-03-15T10:00:00.000Z",
    "eventType": "delivery_complete",
    "telemetry": {
      "packageId": "pkg-1234",
      "recipientId": "recipient-1",
      "latitude": 54.597,
      "longitude": -5.930,
      "batteryLevel": 60
    }
  }
]
```

**Single Invalid Payload** 

This payload will fail validation on battery level being above 100.

```json
{
  "droneId": "drone-01",
  "timestamp": "2026-03-15T10:00:00.000Z",
  "eventType": "battery_log",
  "telemetry": {
    "batteryLevel": 999,
  }
}
```

**Batch Mixed (Valid & Invalid) Payload**

This payload will fail validation on a single entry. The first four entries will process as expected, but the final entry will fail on it's battery level being higher than 100. 

```json
[
  {
    "droneId": "drone-999",
    "timestamp": "2026-03-15T10:00:00.000Z",
    "eventType": "battery_log",
    "telemetry": {
      "batteryLevel": 74,
    }
  },
  {
    "droneId": "drone-999",
    "timestamp": "2026-03-15T10:01:00.000Z",
    "eventType": "delivery_complete",
    "telemetry": {
      "packageId": "pkg-5678",
      "recipientId": "recipient-42",
      "latitude": 54.597,
      "longitude": -5.93,
      "batteryLevel": 60
    }
  },
  {
    "droneId": "drone-1000",
    "timestamp": "2026-03-15T10:02:00.000Z",
    "eventType": "route_adjustment",
    "telemetry": {
      "previousRoute": "route-12",
      "newRoute": "route-17",
      "reason": "weather"
    }
  },
  {
    "droneId": "drone-1000",
    "timestamp": "2026-03-15T10:03:00.000Z",
    "eventType": "shutdown",
    "telemetry": {
      "reason": "battery_depleted",
    }
  },
  {
    "droneId": "drone-1001",
    "timestamp": "2026-03-15T10:04:00.000Z",
    "eventType": "battery_log",
    "telemetry": {
      "batteryLevel": 999,
    }
  }
]
```

**Example Response:**
```json
{ "status": "Accepted", "queued": 2 }
```


### `GET /telemetry/:droneId`

Returns all telemetry events for a specific drone, ordered by timestamp descending.

**Example Request**
`GET localhost:3000/droneTelemetry/drone-999`

**Example Response**
```json
{
    "count": 2,
    "results": [
        {
            "id": 603,
            "drone_id": "drone-999",
            "event_type": "delivery_complete",
            "timestamp": "2026-03-15T10:01:00.000Z",
            "telemetry": {
                "latitude": 54.597,
                "longitude": -5.93,
                "packageId": "pkg-5678",
                "recipientId": "recipient-42",
                "batteryLevel": 60
            },
            "created_at": "2026-03-15T14:40:00.453Z"
        },
        {
            "id": 602,
            "drone_id": "drone-999",
            "event_type": "battery_log",
            "timestamp": "2026-03-15T10:00:00.000Z",
            "telemetry": {
                "batteryLevel": 74
            },
            "created_at": "2026-03-15T14:40:00.445Z"
        }
    ]
}
```

### `GET /deadLetter/`
Returns all unresolved dead letter telemetry

**Example Request**:
`GET localhost:3000/deadLetter/`

**Example Response**
```json
{
    "count": 2,
    "results": [
        {
            "id": 1,
            "received_at": "2026-03-15T14:30:34.283Z",
            "raw_payload": {
                "droneId": "drone-15",
                "eventType": "route_adjustment",
                "telemetry": {
                    "reason": "traffic",
                    "newRoute": "route-43",
                    "previousRoute": "route-35"
                },
                "timestamp": "2026-03-15T14:30:34.202Z"
            },
            "failure_reason": "telemetry.reason Invalid option: expected one of \"weather\"|\"obstacle\"|\"battery\"",
            "drone_id": "drone-15",
            "resolved": false,
            "resolved_at": null,
            "notes": null
        },
        {
            "id": 2,
            "received_at": "2026-03-15T14:32:04.621Z",
            "raw_payload": {
                "droneId": "drone-11",
                "eventType": "route_adjustment",
                "telemetry": {
                    "reason": "traffic",
                    "newRoute": "route-35",
                    "previousRoute": "route-31"
                },
                "timestamp": "2026-03-15T14:32:04.539Z"
            },
            "failure_reason": "telemetry.reason Invalid option: expected one of \"weather\"|\"obstacle\"|\"battery\"",
            "drone_id": "drone-11",
            "resolved": false,
            "resolved_at": null,
            "notes": null
        }
    ]
}
```


### `PUT /deadLetter/{id}/resolve`

Marks a Dead Letter entry as resolved, and records notes against it. 

**Parameters:** 
ID - The ID of the Dead Letter Entry (not a Drone ID)

**Example Request:** 

`PUT localhost:3000/deadLetter/1/resolve`

```json
{
    "notes": "test resolving a dead letter entry"
}
```

**Example Response:**
```json
{
    "status": "Success :: Dead Letter Entry 1 has been marked as resolved."
}
```

---

## Supported Event Types

| Event Type | Description |
|---|---|
| `battery_log` | Battery level reading |
| `delivery_received` | The drone has received a delivery assignment |
| `delivery_begin` | The drone has begun the delivery |
| `delivery_complete` | The drone has successfully completed a delivery |
| `delivery_failed` | The drone has failed a delivery |
| `route_adjustment` | The drone has changed it's route changed due to weather, obstacle, battery, or traffic (traffic is purposefully bad data) |
| `shutdown` | The drone has shut down |

---


## Interrogating the Database

The following SQL scripts can be used to interrogate the database directly. 

### Example Scripts
**Find all logs from drones when their battery level is above 50%**  
```sql

SELECT drone_id, drone_telemetry.timestamp, (drone_telemetry.telemetry -> 'batteryLevel')::int as battery_level  
FROM drone_telemetry  
WHERE (telemetry -> 'batteryLevel')::int > 50  
ORDER BY timestamp DESC;  

```

**Find all failed deliveries**  
```sql

SELECT drone_id, drone_telemetry.timestamp, (drone_telemetry.telemetry -> 'reason') as reason  
from drone_telemetry  
WHERE event_type = 'delivery_failed'  
ORDER BY timestamp DESC;  
```

**Find all unresolved dead letter entries**  
```sql

SELECT * from dead_letter_telemetry  
WHERE resolved = false  
ORDER BY received_at DESC;
```


### Running the Scripts

Either through docker compose (replace "\<SQL QUERY>" with one of the example scripts)
````bash
docker compose exec postgres psql -U sc_user -d drone_telemetry -c "<SQL QUERY>"
````

or through a Database browser. 

<<IMAGE OF DATAGRIP SETTINGS>>

(An example of the Database setup in JetBrains Datagrip, check the docker-compose.yaml for valid username, password & port values)

## Running Tests
```bash
npm test
```

### Test coverage

- **Validator** — happy path and edge cases for all event types, including boundary conditions on battery level and coordinates
- **Transformer** — timestamp parsing, field preservation across all event types
- **API** — single and batch ingestion, status codes, producer integration

---

## Project Structure
```
src/
├── api/
│   └── routes/
├── db/
│   ├── dbClient.ts
│   ├── droneTelemetry.repository.ts
│   └── deadLetter.repository.ts
├── processing/
│   ├── validator.ts
│   └── transformer.ts
├── queue/
│   ├── producer.ts
│   └── worker.ts
├── simulator/
│   └── droneSimulator.ts
├── types/
│   ├── droneEventType.ts
│   ├── rawDroneTelemetry.ts
│   └── validDroneTelemetry.ts
├── config.ts
└── index.ts
db/
└── migrations/
    ├── 001_create_telemetry_events.sql
    └── 002_create_dead_letter_events.sql
tests/
└── unit/
    ├── validator.test.ts
    ├── transformer.test.ts
    └── api.test.ts
```

---

## Assumptions, Further Considerations & Challenges

### Assumptions:
In the design of this system I have made the following assumptions: 
- The Drone Fleet is of the scale that would operate within a small city (like Belfast), and therefore, vertical or horizontal scaling are not implemented. 
- A drone does not take it's location of shutdown into consideration.
- For the purposes of having the system run in a reasonable timeframe, the 'travel time' from delivery to delivery is not taken into consideration.

### Further Considerations
- **WebSocket Alerting**: 
	- For example, creating real-time alerts that push to dashboard when a drone's battery drops below a threshold (similar to the low battery warning event)
- **Kafka**:
	- If the drone fleet scales beyond the capabilities of BullMQ, Kafka would be a better option
- **MongoDB**
	- If horizontal scaling becomes a priority, to the point where it has better performance than vertically scaling the PostgreSQL database.
- **External Logger**
	- This implementation currently relies on fastifys' built in logger, and console.log(), a full implementation should include a 'proper' logger to create logs that could be used by analysis tools like Datadog. 
- **Integration Testing**
	- The current implementation only performs unit tests. For a full implementation, integration tests would need to be considered. For example:
		- Does the API/Queue correctly write to the telemetry table?
		- Does the API/Queue correctly write to the dead letter table? 
		- Does the Pipeline work end-to-end? (From the beginning of the API to successfully writing to the database)


### Challenges
- As mentioned above, there was an issue in which another instance of Postgres was running and conflicting with the ports. I had assumed my dev environment was 'clean'.
- There was an issue with the `docker-entrypoint-initdb.d` not running, and as it turns out, it only runs on the first run of a fresh volume, leading to me to run `docker compose down -v` each time I wanted to start again. 
- I haven't written event-driven architecture in an 'enterprise' environment, but I was able to draw on principles I have encountered in my game development journey to help design the system. (Unity has a similar implementation of events/messages)

## Use of Artificial Intelligence

For the duration of this project, I used mostly Anthropic's Claude (Sonnet 4.6), apart from a specific timeframe in which Claude was down, in which case Chat GPT (GPT-5.3).

Claude was used in the context of a pair programmer to bounce ideas off, help compare frameworks at a glance, and to help debug errors. 

During development of the test suite, Claude was used to generate boilerplate code, as most of the unit tests are quite simple and repetitive. 

During the writing of this README, Claude was used to generate the project structure as seen above, and to generate example payloads for the API reference, which were then tested manually.

A particularly useful piece of debugging with Claude came around attempting to connect to the PostgreSQL database using the default port. A forgotten about pre-existing instance of postgres existed on the development machine and was causing confusion, Claude helped debug using terminal commands to check what services were using the ports and I was able to rectify the issue  from there. 


## Tools Used: 

**Development:**
Microsoft Visual Studio Code: https://code.visualstudio.com/
Jetbrains Rider: https://www.jetbrains.com/rider/
Jetbrains Datagrip: https://www.jetbrains.com/datagrip/

**Version Control:**
Fork : https://git-fork.com/
Github : https://github.com

**Note Keeping & Diagrams**
Obsidian: https://obsidian.md/
Diagram:  https://app.diagrams.net/
ShareX: https://getsharex.com/

**Artificial Intelligence**
Anthropic Claude (Sonnet 4.6): https://claude.ai/
OpenAI Chat GPT (GPT-5.3): https://chatgpt.com/

**API Testing**
Postman: https://www.postman.com/

## Development/Test Machines

This system was developed and tested across two machines

Machine 1 - Microsoft Windows Desktop PC
```
Operating System: Windows 10 Home
Processor : AMD Ryzen 9 5950X @3.4Ghz
Memory : 64GB
```

Machine 2 - Apple Macbook Pro
```
Operating System: MacOS 26 (Tahoe)
Processor: Apple Silicon M1 Max
Memory: 64GB
```
