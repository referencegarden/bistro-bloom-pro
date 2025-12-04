-- Fix validate_wifi_ssid function to have immutable search_path
CREATE OR REPLACE FUNCTION public.validate_wifi_ssid(_ssid text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN _ssid = 'ReferenceGarden';
END;
$function$;