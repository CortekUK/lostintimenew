-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- RAG Documents table - stores embeddings for semantic search
CREATE TABLE IF NOT EXISTS rag_documents (
  id BIGSERIAL PRIMARY KEY,
  source_table TEXT NOT NULL,  -- products, customers, sales, suppliers, expenses
  source_id TEXT NOT NULL,      -- ID from the source table
  content TEXT NOT NULL,        -- The text content that was embedded
  embedding vector(1536),       -- OpenAI text-embedding-ada-002 produces 1536 dimensions
  metadata JSONB DEFAULT '{}',  -- Additional metadata for filtering
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_table, source_id)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS rag_documents_embedding_idx
  ON rag_documents
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for filtering by source table
CREATE INDEX IF NOT EXISTS rag_documents_source_table_idx ON rag_documents(source_table);

-- RAG Sync Queue - tracks changes that need embedding updates
CREATE TABLE IF NOT EXISTS rag_sync_queue (
  id BIGSERIAL PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Index for unprocessed items
CREATE INDEX IF NOT EXISTS rag_sync_queue_unprocessed_idx
  ON rag_sync_queue(created_at)
  WHERE processed_at IS NULL;

-- Chat Messages table - stores conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]',  -- Array of {table, id} for sources used
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fetching user conversations
CREATE INDEX IF NOT EXISTS chat_messages_user_conversation_idx
  ON chat_messages(user_id, conversation_id, created_at);

-- Function to match documents using vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_tables TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  source_table TEXT,
  source_id TEXT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rd.id,
    rd.source_table,
    rd.source_id,
    rd.content,
    rd.metadata,
    1 - (rd.embedding <=> query_embedding) AS similarity
  FROM rag_documents rd
  WHERE (filter_tables IS NULL OR rd.source_table = ANY(filter_tables))
    AND 1 - (rd.embedding <=> query_embedding) > match_threshold
  ORDER BY rd.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Trigger function to queue changes for products
CREATE OR REPLACE FUNCTION queue_product_for_rag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('products', OLD.id::TEXT, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('products', NEW.id::TEXT, TG_OP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to queue changes for customers
CREATE OR REPLACE FUNCTION queue_customer_for_rag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('customers', OLD.id::TEXT, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('customers', NEW.id::TEXT, TG_OP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to queue changes for sales
CREATE OR REPLACE FUNCTION queue_sale_for_rag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('sales', OLD.id::TEXT, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('sales', NEW.id::TEXT, TG_OP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to queue changes for suppliers
CREATE OR REPLACE FUNCTION queue_supplier_for_rag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('suppliers', OLD.id::TEXT, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('suppliers', NEW.id::TEXT, TG_OP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to queue changes for expenses
CREATE OR REPLACE FUNCTION queue_expense_for_rag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('expenses', OLD.id::TEXT, 'DELETE');
    RETURN OLD;
  ELSE
    INSERT INTO rag_sync_queue (source_table, source_id, action)
    VALUES ('expenses', NEW.id::TEXT, TG_OP);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table
DROP TRIGGER IF EXISTS products_rag_trigger ON products;
CREATE TRIGGER products_rag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION queue_product_for_rag();

DROP TRIGGER IF EXISTS customers_rag_trigger ON customers;
CREATE TRIGGER customers_rag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION queue_customer_for_rag();

DROP TRIGGER IF EXISTS sales_rag_trigger ON sales;
CREATE TRIGGER sales_rag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON sales
  FOR EACH ROW EXECUTE FUNCTION queue_sale_for_rag();

DROP TRIGGER IF EXISTS suppliers_rag_trigger ON suppliers;
CREATE TRIGGER suppliers_rag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION queue_supplier_for_rag();

DROP TRIGGER IF EXISTS expenses_rag_trigger ON expenses;
CREATE TRIGGER expenses_rag_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION queue_expense_for_rag();

-- RLS Policies for rag_documents (read-only for authenticated users)
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users"
  ON rag_documents FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for chat_messages (users can only access their own messages)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own messages"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT ON rag_documents TO authenticated;
GRANT ALL ON chat_messages TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE chat_messages_id_seq TO authenticated;
