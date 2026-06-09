-- ============================================================
-- Medical Agent – PostgreSQL initialisation script
-- Runs once when the Postgres container is first created.
-- LangGraph checkpoint tables are created at runtime by
-- PostgresSaver.setup() inside the backend lifespan handler.
-- ============================================================

-- Ensure the database exists (already created by POSTGRES_DB env var,
-- but kept here for clarity when running against a plain Postgres instance).
-- CREATE DATABASE agentdb;  -- uncomment if running manually outside Docker

-- Verify the agent user has full rights on the database
GRANT ALL PRIVILEGES ON DATABASE agentdb TO agent;

-- ============================================================
-- LangGraph checkpoint schema
-- These three tables are created by PostgresSaver.setup(), but
-- declaring them here as well makes the schema self-documenting.
-- ============================================================

-- checkpoints      – one row per (thread_id, checkpoint_ns, checkpoint_id)
-- checkpoint_blobs – binary blobs for each channel / version
-- checkpoint_writes – pending writes not yet committed to a checkpoint

-- The tables are owned by the `agent` role so the backend can
-- create / alter them without superuser privileges.
ALTER ROLE agent CREATEDB;
