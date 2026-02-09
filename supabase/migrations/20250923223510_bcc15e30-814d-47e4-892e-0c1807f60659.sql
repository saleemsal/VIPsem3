-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  pages int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create document_pages table for text content
CREATE TABLE IF NOT EXISTS public.document_pages (
  id bigserial PRIMARY KEY,
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  page int NOT NULL,
  text text NOT NULL
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_pages ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents
CREATE POLICY "documents owner read" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "documents owner insert" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "documents owner delete" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for document_pages
CREATE POLICY "doc_pages owner read" ON public.document_pages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.user_id = auth.uid()
  ));

CREATE POLICY "doc_pages owner insert" ON public.document_pages
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.documents d 
    WHERE d.id = document_id AND d.user_id = auth.uid()
  ));

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public) VALUES ('files', 'files', false);

-- Storage policies
CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own files" ON storage.objects
  FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);