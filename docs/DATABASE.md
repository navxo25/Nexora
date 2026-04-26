# Nexora Database Documentation

## Tables

### users
Stores all platform users. Linked to Supabase Auth via `id` (UUID).

| Column           | Type      | Notes                              |
|------------------|-----------|------------------------------------|
| id               | UUID      | PK, matches Supabase auth.users.id |
| email            | TEXT      | Unique                             |
| full_name        | TEXT      |                                    |
| role             | TEXT      | citizen / agent / moderator / admin|
| ward_assignment  | TEXT      | Agents only                        |
| is_active        | BOOLEAN   | Soft-disable without deleting      |

### complaints
Core table. Uses PostGIS GEOMETRY(Point, 4326) for spatial queries.

| Column      | Type         | Notes                           |
|-------------|--------------|---------------------------------|
| id          | UUID         | PK                              |
| user_id     | UUID         | FK → users.id                  |
| location    | GEOMETRY     | ST_Point(longitude, latitude)   |
| latitude    | NUMERIC      | Stored separately for fast reads|
| longitude   | NUMERIC      | Stored separately for fast reads|
| status      | TEXT         | submitted/verified/in-progress/ |
|             |              | resolved/closed                 |
| overdue     | BOOLEAN      | Set by SLA cron after 72h       |

### complaint_status_history
Audit log — every status change is recorded here.

## Indices
- idx_complaints_location (GIST) — spatial queries via ST_Distance
- idx_complaints_status — filter by status
- idx_complaints_ward — filter by ward
- idx_complaints_overdue — cron job queries

## Running Migrations
1. Open Supabase Dashboard → SQL Editor
2. Paste the contents of database/schema.sql
3. Click Run
4. For seed data: paste database/seed.sql and Run
