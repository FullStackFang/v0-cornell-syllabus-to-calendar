-- Supabase Database Schema for CourseFlow AI
-- Run this in Supabase SQL Editor to set up the database

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'professor' CHECK (role IN ('professor', 'student')),
  email_local_part TEXT,
  email_domain TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrations table (for Gmail, Calendar connectors)
CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'paused', 'disconnected')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  provider_metadata JSONB DEFAULT '{}',
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, email_local_part, email_domain)
  VALUES (
    NEW.id,
    NEW.email,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 2)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for integrations
DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
CREATE POLICY "Users can view own integrations" ON public.integrations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
CREATE POLICY "Users can insert own integrations" ON public.integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;
CREATE POLICY "Users can update own integrations" ON public.integrations
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own integrations" ON public.integrations;
CREATE POLICY "Users can delete own integrations" ON public.integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_code TEXT NOT NULL,
  semester TEXT NOT NULL,
  plus_address TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  settings JSONB DEFAULT '{
    "auto_reply_enabled": false,
    "confidence_threshold": 0.85,
    "disclaimer": "This response was generated with AI assistance."
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique per professor + course_code + semester
  -- (different profs can teach same course, same prof can teach across semesters)
  UNIQUE(professor_id, course_code, semester)
);

-- Create indexes for courses
CREATE INDEX IF NOT EXISTS idx_courses_professor_id ON public.courses(professor_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_plus_address ON public.courses(plus_address);

-- Auto-update updated_at for courses
DROP TRIGGER IF EXISTS on_courses_updated ON public.courses;
CREATE TRIGGER on_courses_updated
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS for courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
DROP POLICY IF EXISTS "Professors can view own courses" ON public.courses;
CREATE POLICY "Professors can view own courses" ON public.courses
  FOR SELECT USING (auth.uid() = professor_id);

DROP POLICY IF EXISTS "Professors can insert own courses" ON public.courses;
CREATE POLICY "Professors can insert own courses" ON public.courses
  FOR INSERT WITH CHECK (auth.uid() = professor_id);

DROP POLICY IF EXISTS "Professors can update own courses" ON public.courses;
CREATE POLICY "Professors can update own courses" ON public.courses
  FOR UPDATE USING (auth.uid() = professor_id);

DROP POLICY IF EXISTS "Professors can delete own courses" ON public.courses;
CREATE POLICY "Professors can delete own courses" ON public.courses
  FOR DELETE USING (auth.uid() = professor_id);

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Course materials table (uploaded syllabi, documents)
CREATE TABLE IF NOT EXISTS public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  file_path TEXT,
  file_hash TEXT,  -- SHA-256 hash for duplicate detection
  extracted_text TEXT,
  is_syllabus BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for course_materials
CREATE INDEX IF NOT EXISTS idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX IF NOT EXISTS idx_course_materials_file_hash ON public.course_materials(file_hash);

-- Enable RLS for course_materials
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

-- RLS: Professors can manage materials for their own courses
DROP POLICY IF EXISTS "Professors can view own course materials" ON public.course_materials;
CREATE POLICY "Professors can view own course materials" ON public.course_materials
  FOR SELECT USING (
    course_id IS NULL OR  -- Allow viewing unlinked materials (during upload)
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Professors can insert course materials" ON public.course_materials;
CREATE POLICY "Professors can insert course materials" ON public.course_materials
  FOR INSERT WITH CHECK (
    course_id IS NULL OR
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Professors can update own course materials" ON public.course_materials;
CREATE POLICY "Professors can update own course materials" ON public.course_materials
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
  );

DROP POLICY IF EXISTS "Professors can delete own course materials" ON public.course_materials;
CREATE POLICY "Professors can delete own course materials" ON public.course_materials
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND professor_id = auth.uid())
  );

-- Material chunks table (for semantic search)
CREATE TABLE IF NOT EXISTS public.material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  token_count INTEGER,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for material_chunks
CREATE INDEX IF NOT EXISTS idx_material_chunks_material_id ON public.material_chunks(material_id);

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_material_chunks_embedding ON public.material_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Enable RLS for material_chunks
ALTER TABLE public.material_chunks ENABLE ROW LEVEL SECURITY;

-- RLS: Access through parent material
DROP POLICY IF EXISTS "Professors can view own material chunks" ON public.material_chunks;
CREATE POLICY "Professors can view own material chunks" ON public.material_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.courses c ON cm.course_id = c.id
      WHERE cm.id = material_id AND c.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professors can insert material chunks" ON public.material_chunks;
CREATE POLICY "Professors can insert material chunks" ON public.material_chunks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.courses c ON cm.course_id = c.id
      WHERE cm.id = material_id AND c.professor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professors can delete own material chunks" ON public.material_chunks;
CREATE POLICY "Professors can delete own material chunks" ON public.material_chunks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.course_materials cm
      JOIN public.courses c ON cm.course_id = c.id
      WHERE cm.id = material_id AND c.professor_id = auth.uid()
    )
  );

-- Function for semantic search of material chunks
CREATE OR REPLACE FUNCTION search_material_chunks(
  query_embedding vector(1536),
  course_id_filter UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  content TEXT,
  similarity FLOAT,
  material_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.content,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.material_id
  FROM public.material_chunks mc
  JOIN public.course_materials cm ON mc.material_id = cm.id
  WHERE cm.course_id = course_id_filter
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
