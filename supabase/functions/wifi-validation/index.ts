import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {}
    
    let candidateIp: string | undefined = body?.ipAddress;
    const tenantId: string | undefined = body?.tenantId;

    // Fallback: derive IP from request headers when browser cannot expose local IP (iOS Safari)
    if (!candidateIp) {
      const forwarded = req.headers.get('x-forwarded-for') || '';
      const realIp = req.headers.get('x-real-ip') || '';
      const cfIp = req.headers.get('cf-connecting-ip') || '';
      candidateIp = (forwarded.split(',')[0] || realIp || cfIp || '').trim() || undefined;
    }

    if (!candidateIp) {
      return new Response(
        JSON.stringify({ valid: false, error: "IP address is required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Validating IP address: ${candidateIp} for tenant: ${tenantId || 'none'}`);

    // If no tenantId provided, fall back to legacy validation
    if (!tenantId) {
      console.log("No tenant ID provided, using legacy validation");
      const isValidRange = validateIPRangeLegacy(candidateIp);
      return new Response(
        JSON.stringify({
          valid: isValidRange,
          ipAddress: candidateIp,
          ssidName: "ReferenceGarden",
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Fetch tenant's Wi-Fi configuration from app_settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('require_wifi_for_attendance, wifi_ssid_name, wifi_ip_range, wifi_public_ip')
      .eq('tenant_id', tenantId)
      .single();

    if (settingsError) {
      console.error("Error fetching tenant settings:", settingsError);
      // Fall back to allowing access if settings can't be fetched
      return new Response(
        JSON.stringify({
          valid: true,
          ipAddress: candidateIp,
          ssidName: null,
          requireWifi: false,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // If Wi-Fi requirement is disabled, always valid
    if (!settings?.require_wifi_for_attendance) {
      console.log("Wi-Fi requirement disabled for tenant");
      return new Response(
        JSON.stringify({
          valid: true,
          ipAddress: candidateIp,
          ssidName: settings?.wifi_ssid_name || null,
          requireWifi: false,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Validate IP against tenant's configured ranges
    const isValid = validateIPRange(
      candidateIp,
      settings.wifi_ip_range || null,
      settings.wifi_public_ip || null
    );

    console.log(`IP ${candidateIp} validation result: ${isValid ? 'VALID' : 'INVALID'}`);
    console.log(`Expected range: ${settings.wifi_ip_range || 'none'}, public IP: ${settings.wifi_public_ip || 'none'}`);

    return new Response(
      JSON.stringify({
        valid: isValid,
        ipAddress: candidateIp,
        ssidName: settings.wifi_ssid_name || null,
        requireWifi: true,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error validating Wi-Fi:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function validateIPRange(ip: string, ipRange: string | null, publicIp: string | null): boolean {
  // Split IP into octets
  const octets = ip.split('.').map(Number);
  
  if (octets.length !== 4 || octets.some(isNaN)) {
    console.log(`Invalid IP format: ${ip}`);
    return false;
  }

  // Check against configured public IP
  if (publicIp && ip === publicIp) {
    console.log(`IP ${ip} matches configured public IP`);
    return true;
  }

  // Check against configured IP range (first 3 octets)
  if (ipRange) {
    const rangeOctets = ipRange.split('.').map(Number);
    if (rangeOctets.length >= 3) {
      const matchesRange = 
        octets[0] === rangeOctets[0] &&
        octets[1] === rangeOctets[1] &&
        octets[2] === rangeOctets[2];
      
      if (matchesRange) {
        console.log(`IP ${ip} matches configured range ${ipRange}.x`);
        return true;
      }
    }
  }

  console.log(`IP ${ip} does not match any configured range`);
  return false;
}

// Legacy validation for backwards compatibility (no tenant specified)
function validateIPRangeLegacy(ip: string): boolean {
  const octets = ip.split('.').map(Number);
  
  if (octets.length !== 4 || octets.some(isNaN)) {
    console.log(`Invalid IP format: ${ip}`);
    return false;
  }

  // Legacy: Accept 192.168.11.x and specific public IP
  const isLocalRestaurantRange = (octets[0] === 192 && octets[1] === 168 && octets[2] === 11);
  const isPublicRestaurantIp = ip === '196.119.10.37';

  const isValid = isLocalRestaurantRange || isPublicRestaurantIp;
  console.log(`Legacy validation: IP ${ip} is ${isValid ? 'VALID' : 'INVALID'}`);
  
  return isValid;
}
