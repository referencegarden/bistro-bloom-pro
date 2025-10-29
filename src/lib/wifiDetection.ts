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

    const ips: string[] = [];
    const pickBestIp = () => {
      const privateIp = ips.find((ip) =>
        ip.startsWith("192.168.") ||
        ip.startsWith("10.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)
      );
      return privateIp ?? ips[0] ?? null;
    };

    pc.onicecandidate = (event) => {
      if (!event || !event.candidate) {
        // end of candidates, resolve best option
        resolve(pickBestIp());
        pc.close();
        return;
      }

      const candidate = event.candidate.candidate;
      const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
      const match = candidate.match(ipRegex);

      if (match) {
        const ip = match[1];
        if (!ips.includes(ip)) ips.push(ip);
      }
    };

    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .catch(() => resolve(null));

    // Timeout after 5 seconds
    setTimeout(() => {
      const best = pickBestIp();
      pc.close();
      resolve(best);
    }, 5000);
  });
}
