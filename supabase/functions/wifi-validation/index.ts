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
    const { ipAddress } = await req.json();

    if (!ipAddress) {
      return new Response(
        JSON.stringify({ valid: false, error: "IP address is required" }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`Validating IP address: ${ipAddress}`);

    // Restaurant network IP range validation
    // This should be configured based on the actual restaurant network
    // Example: 192.168.1.x range for restaurant Wi-Fi
    const isValidRange = validateIPRange(ipAddress);

    console.log(`IP validation result: ${isValidRange}`);

    return new Response(
      JSON.stringify({
        valid: isValidRange,
        ipAddress,
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

  // ReferenceGarden restaurant Wi-Fi local network range: 192.168.11.x
  // This is the private network range assigned by the restaurant router
  const isRestaurantRange = (octets[0] === 192 && octets[1] === 168 && octets[2] === 11);

  console.log(`IP ${ip} validation: ${isRestaurantRange ? 'VALID' : 'INVALID'} (Expected: 192.168.11.x)`);
  
  return isRestaurantRange;
}
