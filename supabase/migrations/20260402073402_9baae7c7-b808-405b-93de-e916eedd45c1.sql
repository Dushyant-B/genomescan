
-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Genetic uploads table
CREATE TABLE public.genetic_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  disease_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.genetic_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own uploads" ON public.genetic_uploads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own uploads" ON public.genetic_uploads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own uploads" ON public.genetic_uploads FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own uploads" ON public.genetic_uploads FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_genetic_uploads_updated_at
  BEFORE UPDATE ON public.genetic_uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Genetic reports table
CREATE TABLE public.genetic_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID REFERENCES public.genetic_uploads(id) ON DELETE SET NULL,
  disease_type TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  risk_score NUMERIC NOT NULL,
  gene_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.genetic_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.genetic_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON public.genetic_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.genetic_reports FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for genetic CSV files
INSERT INTO storage.buckets (id, name, public) VALUES ('genetic-files', 'genetic-files', false);

CREATE POLICY "Users can upload own genetic files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'genetic-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own genetic files" ON storage.objects FOR SELECT USING (bucket_id = 'genetic-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own genetic files" ON storage.objects FOR DELETE USING (bucket_id = 'genetic-files' AND auth.uid()::text = (storage.foldername(name))[1]);
