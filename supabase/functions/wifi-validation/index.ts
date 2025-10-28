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
    return false;
  }

  // Example validation: Check if IP is in restaurant's network range
  // 192.168.1.x (typical router range)
  // 10.0.0.x (another common private range)
  // Adjust these ranges based on actual restaurant network configuration
  
  const isRestaurantRange = 
    (octets[0] === 192 && octets[1] === 168 && octets[2] === 1) ||
    (octets[0] === 10 && octets[1] === 0 && octets[2] === 0);

  return isRestaurantRange;
}
