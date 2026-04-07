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
