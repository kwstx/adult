/**
 * ============================================================================
 * NETWORK SIGNALS & GEO-INTELLIGENCE SERVICE
 * ============================================================================
 * Evaluates IP addresses for VPN, Tor exit nodes, datacenter hosting,
 * subnet clustering, and impossible travel velocity anomalies.
 */

import { GeoLocation, NetworkSignals } from "../types";

export class NetworkSignalService {
  // Common datacenter ASNs & known hosting provider prefixes for heuristic analysis
  private static readonly KNOWN_DATACENTER_ISPS = [
    "amazon",
    "aws",
    "google cloud",
    "digitalocean",
    "hetzner",
    "linode",
    "ovh",
    "vultr",
    "m247",
    "choopa",
    "leaseweb",
    "alibaba",
    "microsoft azure",
    "oracle cloud",
  ];

  // Known Tor exit node IP ranges or test mock entries
  private static readonly KNOWN_TOR_IPS = new Set<string>([
    "185.220.101.5",
    "185.220.101.6",
    "185.220.101.7",
    "109.70.100.25",
    "176.10.99.200",
  ]);

  /**
   * Resolves client IP from standard reverse-proxy headers.
   */
  static extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
    const getHeader = (name: string): string | undefined => {
      if (typeof (headers as any).get === "function") {
        return (headers as any).get(name) || undefined;
      }
      const val = (headers as Record<string, any>)[name] || (headers as Record<string, any>)[name.toLowerCase()];
      if (Array.isArray(val)) return val[0];
      return val;
    };

    const cfIp = getHeader("cf-connecting-ip");
    if (cfIp) return cfIp.trim();

    const xRealIp = getHeader("x-real-ip");
    if (xRealIp) return xRealIp.trim();

    const xForwardedFor = getHeader("x-forwarded-for");
    if (xForwardedFor) {
      const parts = xForwardedFor.split(",");
      if (parts.length > 0 && parts[0].trim()) {
        return parts[0].trim();
      }
    }

    return "127.0.0.1";
  }

  /**
   * Extracts the /24 subnet for IPv4 or /64 for IPv6 to detect multi-account clustering.
   */
  static extractSubnet(ip: string): string {
    if (ip.includes(":")) {
      // IPv6: first 4 groups
      const parts = ip.split(":");
      return parts.slice(0, 4).join(":") + "::/64";
    }
    // IPv4: first 3 octets
    const parts = ip.split(".");
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return ip;
  }

  /**
   * Calculates great-circle distance (Haversine formula) in kilometers between two geo coordinates.
   */
  static calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Evaluates if impossible travel occurred between two sequential events.
   * Commercial flights cruise at ~800-900 km/h. Any speed > 850 km/h over > 200km is flagged.
   */
  static evaluateImpossibleTravel(
    prevGeo?: GeoLocation,
    prevTimestamp?: number | Date,
    currentGeo?: GeoLocation,
    currentTimestamp: number | Date = Date.now()
  ): { impossibleTravelDetected: boolean; speedKmh: number; distanceKm: number } {
    if (!prevGeo || !currentGeo || !prevTimestamp) {
      return { impossibleTravelDetected: false, speedKmh: 0, distanceKm: 0 };
    }

    const t1 = typeof prevTimestamp === "number" ? prevTimestamp : prevTimestamp.getTime();
    const t2 = typeof currentTimestamp === "number" ? currentTimestamp : currentTimestamp.getTime();
    const elapsedHours = Math.max(0.001, (t2 - t1) / (1000 * 3600));

    const distanceKm = this.calculateHaversineDistanceKm(
      prevGeo.latitude,
      prevGeo.longitude,
      currentGeo.latitude,
      currentGeo.longitude
    );

    const speedKmh = distanceKm / elapsedHours;

    // Impossible travel threshold: > 850 km/h and distance > 250 km
    const impossibleTravelDetected = distanceKm > 250 && speedKmh > 850;

    return {
      impossibleTravelDetected,
      speedKmh: Math.round(speedKmh),
      distanceKm: Math.round(distanceKm),
    };
  }

  /**
   * Evaluates full network signals for a given request.
   */
  static analyzeNetwork(
    ip: string,
    currentGeo?: GeoLocation,
    previousGeo?: GeoLocation,
    previousTimestamp?: number | Date
  ): NetworkSignals {
    const isTor = this.KNOWN_TOR_IPS.has(ip);

    // Check if IP matches localhost or private range
    const isLocal = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");

    // Datacenter heuristic
    const isDatacenter = !isLocal && (ip.startsWith("35.") || ip.startsWith("34.") || ip.startsWith("54.") || ip.startsWith("52."));

    const travelCheck = this.evaluateImpossibleTravel(previousGeo, previousTimestamp, currentGeo);

    return {
      ip,
      isDatacenter,
      isVpnOrProxy: isTor || isDatacenter,
      isTorExitNode: isTor,
      countryCode: currentGeo?.countryCode,
      impossibleTravelDetected: travelCheck.impossibleTravelDetected,
      calculatedSpeedKmh: travelCheck.speedKmh,
      previousGeo,
      currentGeo,
    };
  }
}
