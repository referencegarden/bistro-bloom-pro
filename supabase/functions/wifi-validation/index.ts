import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    console.log(`Validating IP address: ${candidateIp}`);

    // Restaurant network IP range validation
    // This should be configured based on the actual restaurant network
    // Example: 192.168.1.x range for restaurant Wi-Fi
    const isValidRange = validateIPRange(candidateIp);

    console.log(`IP validation result: ${isValidRange}`);

    return new Response(
      JSON.stringify({
        valid: isValidRange,
        ipAddress: candidateIp,
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

function validateIPRange(ip: string): boolean {
  // Split IP into octets
  const octets = ip.split('.').map(Number);
  
  if (octets.length !== 4 || octets.some(isNaN)) {
    console.log(`Invalid IP format: ${ip}`);
    return false;
  }

  // ReferenceGarden restaurant Wi-Fi validation
  // Accept devices on local LAN 192.168.11.x and fallback to known public IP (iOS may expose srflx/public)
  const isLocalRestaurantRange = (octets[0] === 192 && octets[1] === 168 && octets[2] === 11);
  const isPublicRestaurantIp = ip === '196.119.10.37';

  const isValid = isLocalRestaurantRange || isPublicRestaurantIp;

  console.log(`IP ${ip} validation: ${isValid ? 'VALID' : 'INVALID'} (Expected: 192.168.11.x or 196.119.10.37)`);
  
  return isValid;
}
