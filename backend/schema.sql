-- ============================================================
-- Distributed AI OS — Database Schema
-- Run this in your MySQL client to set up the database
-- ============================================================

CREATE DATABASE IF NOT EXISTS relay;
USE relay;

-- ============================================================
-- 1. SESSIONS — replaces in-memory Map
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id          VARCHAR(36)  PRIMARY KEY,          -- UUID
    title       VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. MESSAGES — replaces the messages[] array inside sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    session_id  VARCHAR(36)  NOT NULL,
    role        ENUM('user', 'assistant', 'system') NOT NULL,
    content     LONGTEXT     NOT NULL,
    model       VARCHAR(100) DEFAULT NULL,          -- which AI model responded
    timestamp   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Only create if it doesn't already exist
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'messages' AND index_name = 'idx_messages_session');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_messages_session ON messages(session_id, timestamp)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 3. MODELS — replaces hardcoded models array
-- ============================================================
CREATE TABLE IF NOT EXISTS models (
    id                INT          PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    provider          VARCHAR(50)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
    capabilities      JSON         NOT NULL,           -- ["text-generation","code"]
    cost_per_1k       DECIMAL(10,6) NOT NULL DEFAULT 0,
    avg_latency       INT          NOT NULL DEFAULT 0, -- ms
    rate_limit        JSON         NOT NULL,            -- {"rpm":60,"tpm":100000}
    context_window    INT          NOT NULL DEFAULT 0,
    max_output_tokens INT          NOT NULL DEFAULT 0,
    endpoint          VARCHAR(255) NOT NULL,
    model_id          VARCHAR(100) NOT NULL,
    api_provider      VARCHAR(50)  NOT NULL
);

-- ============================================================
-- 4. REQUEST_HISTORY — replaces in-memory requestHistory[]
-- ============================================================
CREATE TABLE IF NOT EXISTS request_history (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    model       VARCHAR(100) NOT NULL,
    latency     INT          NOT NULL,     -- ms
    cost        DECIMAL(10,6) NOT NULL DEFAULT 0,
    timestamp   BIGINT       NOT NULL      -- epoch ms
);

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'request_history' AND index_name = 'idx_request_history_ts');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_request_history_ts ON request_history(timestamp)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 5. CONVERSATION_SUMMARIES — replaces JSON files on disk
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id                INT          AUTO_INCREMENT PRIMARY KEY,
    session_id        VARCHAR(36)  NOT NULL,
    user_summary      TEXT         NOT NULL,
    response_summary  TEXT         NOT NULL,
    model             VARCHAR(100) NOT NULL,
    timestamp         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'conversation_summaries' AND index_name = 'idx_conv_summaries_session');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_conv_summaries_session ON conversation_summaries(session_id, timestamp)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 6. MEMORIES — user-curated facts and insights (Phase 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(36) PRIMARY KEY,
  content TEXT NOT NULL,
  source_session_id VARCHAR(36),
  source_message_index INT,
  tags JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (source_session_id) REFERENCES sessions(id) ON DELETE SET NULL
);

-- ============================================================
-- 7. ADD context_messages COLUMN to sessions (Phase 3)
-- ============================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sessions' AND column_name = 'context_messages');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN context_messages JSON', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 8. SEED MODELS — insert the default models
-- ============================================================
INSERT IGNORE INTO models (id, name, provider, status, capabilities, cost_per_1k, avg_latency, rate_limit, context_window, max_output_tokens, endpoint, model_id, api_provider) VALUES
(2,  'Codestral',              'Mistral',  'active', '["text-generation","code","reasoning","documentation"]',     0, 250, '{"rpm":60,"tpm":100000}',                       128000, 128000, 'https://codestral.mistral.ai', 'codestral-latest',                              'mistral'),
(3,  'Z.AI GLM 4.7',          'Cerebras', 'active', '["text-generation","code","reasoning"]',                     0, 180, '{"rpm":10,"tpm":60000,"rpd":100}',              128000, 128000, 'https://api.cerebras.ai',      'zai-glm-4.7',                                  'cerebras'),
(4,  'OpenAI GPT OSS',        'Cerebras', 'active', '["text-generation","code","reasoning","analysis"]',          0, 200, '{"rpm":30,"tpm":64000,"rpd":14400}',            128000,  65536, 'https://api.cerebras.ai',      'gpt-oss-120b',                                  'cerebras'),
(5,  'Llama 3.1 8B',          'Cerebras', 'active', '["text-generation","code"]',                                 0, 150, '{"rpm":30,"tpm":60000,"rpd":14400}',            128000, 128000, 'https://api.cerebras.ai',      'llama3.1-8b',                                   'cerebras'),
(6,  'Allam 2 7B',            'Groq',     'active', '["text-generation","multilingual"]',                         0, 150, '{"rpm":30,"rpd":7000,"tpm":6000,"tpd":500000}', 4096,   4096,  'https://api.groq.com',         'allam-2-7b',                                    'groq'),
(7,  'Llama 3.1 8B Instant',  'Groq',     'active', '["text-generation","code"]',                                 0, 120, '{"rpm":30,"rpd":14400,"tpm":6000,"tpd":500000}',131072, 131072, 'https://api.groq.com',         'llama-3.1-8b-instant',                          'groq'),
(8,  'Llama 4 Scout 17B',     'Groq',     'active', '["text-generation","reasoning","analysis"]',                 0, 160, '{"rpm":30,"rpd":1000,"tpm":30000,"tpd":500000}',131072,  8192,  'https://api.groq.com',         'meta-llama/llama-4-scout-17b-16e-instruct',     'groq'),
(9,  'Compound Mini',         'Groq',     'active', '["text-generation"]',                                        0, 100, '{"rpm":30,"rpd":250,"tpm":70000}',              131072,  8192,  'https://api.groq.com',         'groq/compound-mini',                            'groq'),
(10, 'Compound',              'Groq',     'active', '["text-generation","reasoning"]',                            0, 140, '{"rpm":30,"rpd":250,"tpm":70000}',              131072,  8192,  'https://api.groq.com',         'groq/compound',                                 'groq'),
(11, 'Command A Reasoning',   'Cohere',   'active', '["text-generation","reasoning","analysis"]',                 0, 300, '{"rpm":20,"tpm":40000}',                        256000, 32000,  'https://api.cohere.ai',        'command-a-reasoning-08-2025',                   'cohere'),
(12, 'Command R Plus',        'Cohere',   'active', '["text-generation","reasoning","multilingual"]',             0, 280, '{"rpm":20,"tpm":40000}',                        128000,  4000,  'https://api.cohere.ai',        'command-r-plus-08-2024',                        'cohere');

-- ============================================================
-- 9. USER_PROFILES — Phase 4: Accumulated user understanding
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id                INT          PRIMARY KEY DEFAULT 1,  -- Single user for now
    name              VARCHAR(255) DEFAULT NULL,           -- User's name if shared
    preferences       JSON         DEFAULT NULL,           -- Communication preferences
    interests         JSON         DEFAULT NULL,           -- Recurring topics/interests
    behavior_patterns JSON         DEFAULT NULL,           -- How the user interacts
    personal_facts    JSON         DEFAULT NULL,           -- Facts about the user
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default empty profile (single user assumption)
INSERT IGNORE INTO user_profiles (id) VALUES (1);

-- ============================================================
-- 10. SESSION_SUMMARIES — Phase 4: Comprehensive session snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS session_summaries (
    id                INT          AUTO_INCREMENT PRIMARY KEY,
    session_id        VARCHAR(36)  NOT NULL UNIQUE,        -- One summary per session
    summary           TEXT         NOT NULL,               -- Comprehensive narrative
    topics            JSON         DEFAULT NULL,           -- List of topics covered
    outcomes          JSON         DEFAULT NULL,           -- Decisions/solutions reached
    user_info_extracted JSON       DEFAULT NULL,           -- New info learned about user
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'session_summaries' AND index_name = 'idx_session_summaries_session');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_session_summaries_session ON session_summaries(session_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 11. RELAY TRACKING — Phase 5: Follow-up lineage on messages
-- ============================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'messages' AND column_name = 'relay_parent_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE messages ADD COLUMN relay_parent_id INT DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'messages' AND column_name = 'relay_followups');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE messages ADD COLUMN relay_followups JSON DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- 12. SESSION LINEAGE — Phase 5: Track parent-child session relationships
-- ============================================================
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sessions' AND column_name = 'parent_session_id');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN parent_session_id VARCHAR(36) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'sessions' AND column_name = 'relay_topic');
SET @sql = IF(@col_exists = 0, 'ALTER TABLE sessions ADD COLUMN relay_topic VARCHAR(255) DEFAULT NULL', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'sessions' AND index_name = 'idx_sessions_parent');
SET @sql = IF(@idx_exists = 0, 'CREATE INDEX idx_sessions_parent ON sessions(parent_session_id)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;