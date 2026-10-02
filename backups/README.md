# Database backup

`continuum-db.sql` is a full `pg_dump` (schema + data) of the local dev database,
taken 2026-10-02 from the `continuum_postgres` container.

Restore on a new machine (after `docker compose up -d`):

```
docker cp backups/continuum-db.sql continuum_postgres:/tmp/continuum-db.sql
docker exec continuum_postgres psql -U continuum -d continuum -f /tmp/continuum-db.sql
```

The dump drops and recreates every table, so it replaces whatever is in the database.
