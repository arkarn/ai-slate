-- AISlate Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all necessary tables

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- 1. Sessions Table (for tracking user sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Notebooks Table (user's notebooks)
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Pages Table (pages within notebooks)
CREATE TABLE IF NOT EXISTS pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Page Contents Table (stores TLDraw data)
CREATE TABLE IF NOT EXISTS page_contents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  tldraw_data JSONB, -- Optimal for TLDraw snapshots
  image_data TEXT,   -- Base64 image data for previews
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Preferences Table (stores active notebook/page)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  active_notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
  active_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own data

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notebooks policies
CREATE POLICY "Users can view own notebooks" ON notebooks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notebooks" ON notebooks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notebooks" ON notebooks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notebooks" ON notebooks FOR DELETE USING (auth.uid() = user_id);

-- Pages policies (access through notebook ownership)
CREATE POLICY "Users can view own pages" ON pages FOR SELECT USING (
  notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert pages in own notebooks" ON pages FOR INSERT WITH CHECK (
  notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
);
CREATE POLICY "Users can update own pages" ON pages FOR UPDATE USING (
  notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
);
CREATE POLICY "Users can delete own pages" ON pages FOR DELETE USING (
  notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid())
);

-- Page contents policies (access through page ownership)
CREATE POLICY "Users can view own page contents" ON page_contents FOR SELECT USING (
  page_id IN (
    SELECT p.id FROM pages p 
    JOIN notebooks n ON p.notebook_id = n.id 
    WHERE n.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert own page contents" ON page_contents FOR INSERT WITH CHECK (
  page_id IN (
    SELECT p.id FROM pages p 
    JOIN notebooks n ON p.notebook_id = n.id 
    WHERE n.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own page contents" ON page_contents FOR UPDATE USING (
  page_id IN (
    SELECT p.id FROM pages p 
    JOIN notebooks n ON p.notebook_id = n.id 
    WHERE n.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete own page contents" ON page_contents FOR DELETE USING (
  page_id IN (
    SELECT p.id FROM pages p 
    JOIN notebooks n ON p.notebook_id = n.id 
    WHERE n.user_id = auth.uid()
  )
);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_pages_notebook_id ON pages(notebook_id);
CREATE INDEX IF NOT EXISTS idx_page_contents_page_id ON page_contents(page_id);
CREATE INDEX IF NOT EXISTS idx_page_contents_updated_at ON page_contents(updated_at);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_contents_updated_at BEFORE UPDATE ON page_contents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
