
-- Fix search_path for get_unit_conversion_factor function
CREATE OR REPLACE FUNCTION public.get_unit_conversion_factor(from_unit text, to_unit text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  normalized_from_unit text;
  normalized_to_unit text;
BEGIN
  -- Normalize units: "gramme" -> "g"
  normalized_from_unit := CASE 
    WHEN from_unit = 'gramme' THEN 'g'
    ELSE from_unit
  END;
  
  normalized_to_unit := CASE 
    WHEN to_unit = 'gramme' THEN 'g'
    ELSE to_unit
  END;
  
  -- Same unit, no conversion
  IF normalized_from_unit = normalized_to_unit THEN
    RETURN 1;
  END IF;
  
  -- Weight conversions
  IF (normalized_from_unit = 'g' AND normalized_to_unit = 'kg') THEN
    RETURN 0.001;
  END IF;
  IF (normalized_from_unit = 'kg' AND normalized_to_unit = 'g') THEN
    RETURN 1000;
  END IF;
  
  -- Volume conversions
  IF (normalized_from_unit = 'ml' AND normalized_to_unit = 'L') THEN
    RETURN 0.001;
  END IF;
  IF (normalized_from_unit = 'L' AND normalized_to_unit = 'ml') THEN
    RETURN 1000;
  END IF;
  
  -- Default: assume same unit if not recognized
  RETURN 1;
END;
$$;
