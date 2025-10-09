-- Fix existing plain-text PINs to base64-encoded format
UPDATE public.employees 
SET pin_hash = encode(pin_hash::bytea, 'base64')
WHERE pin_enabled = true 
  AND pin_hash IS NOT NULL 
  AND length(pin_hash) < 10; -- Only update plain text PINs (base64 encoded will be longer)