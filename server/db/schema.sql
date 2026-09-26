-- ============================================================================
-- File: server/db/schema.sql
-- Production SQL Schema for ReskillAI
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL DEFAULT 'default_worker',
    email VARCHAR(255) NOT NULL,
    current_role VARCHAR(255) NOT NULL,
    augmentation_score NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_decompositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    task_category VARCHAR(100) NOT NULL,
    automation_potential NUMERIC(5, 2) NOT NULL,
    recommended_strategy TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS co_execution_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
    task_id UUID REFERENCES task_decompositions(id) ON DELETE SET NULL,
    input_intent TEXT NOT NULL,
    generated_prompt TEXT NOT NULL,
    ai_output TEXT NOT NULL,
    human_refinements TEXT,
    time_saved_minutes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
