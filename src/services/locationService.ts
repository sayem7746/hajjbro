import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma } from '@prisma/client';

/** Earth radius in kilometres (for Haversine formula). */
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two points on Earth (in km).
 * @param lat1 Latitude of point 1 (degrees)
 * @param lon1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lon2 Longitude of point 2 (degrees)
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

const locationSelect = {
  id: true,
  slug: true,
  nameEn: true,
  nameAr: true,
  description: true,
  latitude: true,
  longitude: true,
  type: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type LocationPayload = Prisma.LocationGetPayload<{ select: typeof locationSelect }>;

export type FindNearbyParams = {
  lat: number;
  lng: number;
  radiusKm?: number;
  limit?: number;
  type?: string;
};

export type LocationWithDistance = LocationPayload & { distanceKm: number };

/**
 * Find locations within radius (Haversine). Uses bounding-box pre-filter for efficiency.
 * Results sorted by distance ascending; includes distanceKm.
 */
export async function findNearbyLocations(
  params: FindNearbyParams
): Promise<LocationWithDistance[]> {
  const { lat, lng, radiusKm = 50, limit = 20, type } = params;

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new AppError(400, 'lat and lng must be valid numbers');
  }
  if (radiusKm <= 0 || radiusKm > 5000) {
    throw new AppError(400, 'radiusKm must be between 0 and 5000');
  }

  // Approximate degrees for radius (1° ≈ 111 km at equator; use conservative 100 km/degree)
  const degPerKm = 1 / 100;
  const delta = radiusKm * degPerKm;
  const latMin = lat - delta;
  const latMax = lat + delta;
  const lngMin = lng - delta;
  const lngMax = lng + delta;

  const locations = await prisma.location.findMany({
    where: {
      latitude: { gte: latMin, lte: latMax },
      longitude: { gte: lngMin, lte: lngMax },
      ...(type && { type }),
    },
    select: locationSelect,
    take: limit * 3, // fetch extra for post-Haversine filter
  });

  const withDistance: LocationWithDistance[] = [];
  for (const loc of locations) {
    const la = loc.latitude == null ? null : Number(loc.latitude);
    const lo = loc.longitude == null ? null : Number(loc.longitude);
    if (la == null || lo == null) continue;
    const distanceKm = haversineDistanceKm(lat, lng, la, lo);
    if (distanceKm <= radiusKm) {
      withDistance.push({ ...loc, distanceKm });
    }
  }

  withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  return withDistance.slice(0, limit);
}

export async function getLocationById(id: string): Promise<LocationPayload | null> {
  return prisma.location.findUnique({
    where: { id },
    select: locationSelect,
  });
}

export async function getLocationBySlug(slug: string): Promise<LocationPayload | null> {
  return prisma.location.findUnique({
    where: { slug },
    select: locationSelect,
  });
}

export async function listLocations(): Promise<LocationPayload[]> {
  return prisma.location.findMany({
    select: locationSelect,
    orderBy: { nameEn: 'asc' },
  });
}
