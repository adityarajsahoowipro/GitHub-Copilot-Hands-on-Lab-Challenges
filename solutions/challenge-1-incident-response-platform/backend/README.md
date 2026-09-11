# Incident Platform API

Spring Boot API boundary for the Signal Room frontend.

## Stack

- Java 21+
- Spring Boot 3.4
- PostgreSQL 16 with Flyway migrations
- Redis 7 for cache, rate limits, and live coordination
- Kafka for domain-event delivery
- Actuator for health and metrics

## API

- `GET /api/v1/incidents`
- `GET /api/v1/incidents/{incidentId}`
- `POST /api/v1/incidents`
- `PATCH /api/v1/incidents/{incidentId}`
- `POST /api/v1/incidents/{incidentId}/transitions`
- `POST /api/v1/assistant/messages`

Lifecycle transitions are enforced in the domain:

`OPEN -> INVESTIGATING -> MITIGATED -> CLOSED`

A closed incident can be reopened as `INVESTIGATING` within 24 hours of resolution. Invalid transitions return a structured conflict response.

The assistant endpoint is read-only. Configure an OpenAI-compatible provider on Railway with `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL`. It retrieves the selected incident through the domain service and returns a grounded answer with citations. It never changes incident state.

## Local infrastructure

From the repository root:

```powershell
docker compose up -d
```

Then from `backend/`:

```powershell
mvn spring-boot:run
```

Maven and Docker are not currently installed in this environment, so compilation and container startup remain pending.
