CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  club_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id TEXT;

CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE,
  commissioner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  current_matchday INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id UUID,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  role TEXT NOT NULL DEFAULT 'manager',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, user_id)
);

ALTER TABLE league_members ADD COLUMN IF NOT EXISTS club_id UUID;
ALTER TABLE league_members ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS league_transfer_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE UNIQUE,
  phase TEXT NOT NULL DEFAULT 'lobby',
  summer_ready UUID[] NOT NULL DEFAULT '{}'::uuid[],
  winter_ready UUID[] NOT NULL DEFAULT '{}'::uuid[],
  budget INTEGER NOT NULL DEFAULT 25000000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_window (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'summer',
  status TEXT NOT NULL DEFAULT 'closed',
  ready_managers UUID[] NOT NULL DEFAULT '{}'::uuid[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, type)
);

CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  manager_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  squad JSONB NOT NULL DEFAULT '[]'::jsonb,
  tactics JSONB NOT NULL DEFAULT '{}'::jsonb,
  finances JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  home_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  away_club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  home_score INTEGER,
  away_score INTEGER,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_at TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, matchday, home_club_id, away_club_id)
);

CREATE TABLE IF NOT EXISTS standings (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, club_id)
);

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  from_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  to_club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  operation_type TEXT NOT NULL DEFAULT 'direct_buy',
  market_value INTEGER NOT NULL DEFAULT 0,
  offer_fee INTEGER NOT NULL DEFAULT 0,
  wage_offer INTEGER NOT NULL DEFAULT 0,
  contract_years NUMERIC NOT NULL DEFAULT 4,
  agent_commission_percent NUMERIC NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'pending',
  counter_fee INTEGER,
  clauses JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_finances (
  club_id UUID PRIMARY KEY REFERENCES clubs(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 50000000,
  transfer_budget INTEGER NOT NULL DEFAULT 25000000,
  wage_budget INTEGER NOT NULL DEFAULT 1200000,
  weekly_wage_bill INTEGER NOT NULL DEFAULT 650000,
  long_term_debt INTEGER NOT NULL DEFAULT 0,
  annual_income_projection INTEGER NOT NULL DEFAULT 52000000,
  bankrupt BOOLEAN NOT NULL DEFAULT FALSE,
  ffp_status TEXT NOT NULL DEFAULT 'compliant',
  projection JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL DEFAULT 1,
  income JSONB NOT NULL DEFAULT '{}'::jsonb,
  expenses JSONB NOT NULL DEFAULT '{}'::jsonb,
  net_result INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  alerts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tactic_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  matchday INTEGER NOT NULL,
  lineup JSONB NOT NULL DEFAULT '[]'::jsonb,
  tactics JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, club_id, matchday)
);

CREATE TABLE IF NOT EXISTS turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  matchday INTEGER NOT NULL,
  lineup JSONB NOT NULL,
  tactics JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (league_id, club_id, matchday)
);

ALTER TABLE turns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS turns_league_user_matchday_idx
  ON turns (league_id, user_id, matchday)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS leagues_invite_code_idx ON leagues (invite_code);
CREATE INDEX IF NOT EXISTS league_members_user_id_idx ON league_members (user_id);
CREATE INDEX IF NOT EXISTS clubs_league_manager_idx ON clubs (league_id, manager_user_id);
CREATE INDEX IF NOT EXISTS matches_league_matchday_idx ON matches (league_id, matchday, status);
CREATE INDEX IF NOT EXISTS turns_league_matchday_idx ON turns (league_id, matchday);

CREATE TABLE IF NOT EXISTS league_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS league_events_league_created_idx ON league_events (league_id, created_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES leagues(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS standings_league_points_idx ON standings (league_id, points DESC, goal_difference DESC);
CREATE INDEX IF NOT EXISTS transfers_league_created_idx ON transfers (league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS transfer_offers_league_created_idx ON transfer_offers (league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS club_finances_league_idx ON club_finances (league_id);
CREATE INDEX IF NOT EXISTS financial_events_club_created_idx ON financial_events (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_league_created_idx ON chat_messages (league_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tactic_drafts_league_matchday_idx ON tactic_drafts (league_id, matchday);
CREATE INDEX IF NOT EXISTS league_members_club_id_idx ON league_members (club_id);
CREATE INDEX IF NOT EXISTS notifications_league_id_idx ON notifications (league_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'turns'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE turns;
  END IF;
END $$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH table_name IN ARRAY ARRAY['leagues', 'clubs', 'matches', 'standings', 'transfers', 'transfer_offers', 'club_finances', 'financial_events', 'chat_messages', 'tactic_drafts', 'league_transfer_windows', 'transfer_window'] LOOP
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = table_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'league_events'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE league_events;
  END IF;
END $$;
