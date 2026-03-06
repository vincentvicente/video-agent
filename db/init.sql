CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  video_id VARCHAR(50) NOT NULL,
  url VARCHAR(500),
  title VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  language VARCHAR(10),
  duration FLOAT,
  chunk_count INTEGER,
  error_message TEXT,
  source VARCHAR(20) DEFAULT 'youtube',
  original_filename VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Migration for existing tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='source') THEN
    ALTER TABLE videos ADD COLUMN source VARCHAR(20) DEFAULT 'youtube';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='videos' AND column_name='original_filename') THEN
    ALTER TABLE videos ADD COLUMN original_filename VARCHAR(500);
  END IF;
  -- Make url nullable for uploads
  ALTER TABLE videos ALTER COLUMN url DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
