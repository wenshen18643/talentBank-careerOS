-- PostgreSQL schema for Career OS on Supabase.
-- Run this in the Supabase SQL Editor before deploying.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'candidate',
  password TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  company TEXT,
  skills TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'project',
  raw_text TEXT NOT NULL,
  title TEXT,
  extracted TEXT,
  status TEXT NOT NULL DEFAULT 'raw',
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  employer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT,
  required_skills TEXT NOT NULL DEFAULT '[]',
  nice_skills TEXT NOT NULL DEFAULT '[]',
  criteria TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_employer ON jobs(employer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'surfaced',
  strength TEXT NOT NULL DEFAULT 'promising',
  reason TEXT NOT NULL DEFAULT '',
  assumptions TEXT NOT NULL DEFAULT '[]',
  pros TEXT NOT NULL DEFAULT '[]',
  cons TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'offline',
  initiated_by TEXT NOT NULL DEFAULT 'engine',
  candidate_reply TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_job ON matches(job_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_candidate ON matches(candidate_id, status);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
