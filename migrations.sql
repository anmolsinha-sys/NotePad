-- Supabase (PostgreSQL) Migration Script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notes Table
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT DEFAULT 'Untitled Note',
    content TEXT, -- HTML content for rich text
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    collaborators UUID[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    type TEXT DEFAULT 'rich-text' CHECK (type IN ('rich-text', 'code')),
    language TEXT DEFAULT 'javascript',
    images JSONB DEFAULT '[]', -- Array of objects with url and public_id
    is_public BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Note: You'll need to configure RLS policies for granular access control.
-- For now, we'll use the service_role key to bypass RLS in the backend services.

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger for the notes table
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Full-text search (title weight A, content weight B; strip HTML for content)
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS search_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(regexp_replace(content, '<[^>]+>', ' ', 'g'), '')), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS notes_search_idx ON notes USING GIN (search_tsv);

-- Version history
CREATE TABLE IF NOT EXISTS note_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    title TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS note_versions_note_id_idx ON note_versions (note_id, created_at DESC);

-- Viewer-only collaborators (read but not edit). `collaborators` stays as editor-level.
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS viewers UUID[] DEFAULT '{}';

-- Per-note client-side encryption flag (AES-GCM ciphertext lives in content)
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT false;

-- Due date for reminders / Today bucket
ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS due_date DATE;

-- Chat thread per note
CREATE TABLE IF NOT EXISTS note_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS note_comments_note_id_idx ON note_comments (note_id, created_at);
