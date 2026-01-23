-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for vector similarity search on chat_embedding
-- Using HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS chat_embedding_vector_idx ON chat_embedding 
USING hnsw (embedding vector_cosine_ops);

-- Add helpful comment
COMMENT ON COLUMN chat_embedding.embedding IS 'Vector embedding (1536 dimensions) for semantic search using OpenAI text-embedding-3-small';
