export interface WifiStatus {
  isConnected: boolean;
  ssid: string | null;
  ipAddress: string | null;
  error?: string;
}

export async function detectWifiConnection(): Promise<WifiStatus> {
  try {
    // Detect IP address using WebRTC
    const ipAddress = await detectIPAddress();
    
    if (!ipAddress) {
      return {
        isConnected: false,
        ssid: null,
        ipAddress: null,
        error: "Impossible de détecter l'adresse IP"
      };
    }

    // Return detected IP - validation will happen server-side
    return {
      isConnected: true,
      ssid: "ReferenceGarden", // User will confirm this
      ipAddress,
    };
  } catch (error) {
    console.error("Wi-Fi detection error:", error);
    return {
      isConnected: false,
      ssid: null,
      ipAddress: null,
      error: "Erreur lors de la détection du réseau"
    };
  }
}

async function detectIPAddress(): Promise<string | null> {
  return new Promise((resolve) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.createDataChannel("");
    
    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .catch(() => resolve(null));

    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        pc.close();
        return;
      }

      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = candidate.match(ipRegex);

      if (match) {
        resolve(match[1]);
        pc.close();
      }
    };

    // Timeout after 5 seconds
    setTimeout(() => {
      pc.close();
      resolve(null);
    }, 5000);
  });
}
