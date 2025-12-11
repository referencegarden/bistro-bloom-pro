-- Add Wi-Fi configuration columns to app_settings for attendance
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS wifi_ssid_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wifi_ip_range text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wifi_public_ip text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS require_wifi_for_attendance boolean NOT NULL DEFAULT false;