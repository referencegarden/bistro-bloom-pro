-- Create app_settings table
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_logo_url text,
  login_logo_url text,
  restaurant_name text NOT NULL DEFAULT 'RestaurantPro',
  primary_color text NOT NULL DEFAULT 'hsl(142.1 76.2% 36.3%)',
  secondary_color text NOT NULL DEFAULT 'hsl(221.2 83.2% 53.3%)',
  background_color text NOT NULL DEFAULT 'hsl(0 0% 100%)',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_settings
CREATE POLICY "Admins can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create branding storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true);

-- Storage policies for branding bucket
CREATE POLICY "Anyone can view branding files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update branding files"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete branding files"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (restaurant_name) VALUES ('RestaurantPro');