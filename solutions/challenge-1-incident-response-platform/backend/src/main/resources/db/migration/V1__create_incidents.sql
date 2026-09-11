create table incidents (
  incident_id varchar(32) primary key,
  title varchar(200) not null,
  description text not null,
  severity varchar(2) not null check (severity in ('P1', 'P2', 'P3')),
  status varchar(20) not null check (status in ('OPEN', 'INVESTIGATING', 'MITIGATED', 'CLOSED')),
  owner varchar(120) not null,
  impacted_service varchar(120) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  closed_at timestamptz,
  version bigint not null default 0
);

create index idx_incidents_status on incidents(status);
create index idx_incidents_severity on incidents(severity);
create index idx_incidents_service on incidents(impacted_service);
create index idx_incidents_created_at on incidents(created_at desc);

create table incident_timeline (
  id uuid primary key,
  incident_id varchar(32) not null references incidents(incident_id),
  label varchar(160) not null,
  detail text not null,
  tone varchar(20) not null,
  occurred_at timestamptz not null,
  created_by varchar(120) not null
);

create index idx_timeline_incident_time on incident_timeline(incident_id, occurred_at desc);

create table outbox_events (
  id uuid primary key,
  aggregate_type varchar(80) not null,
  aggregate_id varchar(80) not null,
  event_type varchar(120) not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  published_at timestamptz
);

create index idx_outbox_unpublished on outbox_events(published_at) where published_at is null;
