/**
 * Utility functions for the Jeep-Track application
 */
/**
 * Calculate distance between two coordinates using Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export declare function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Calculate bearing between two coordinates
 * @returns Bearing in degrees (0-360)
 */
export declare function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number;
/**
 * Format distance for display
 */
export declare function formatDistance(km: number): string;
/**
 * Calculate ETA in minutes
 * @param distanceKm Distance in kilometers
 * @param speedKph Average speed in km/h
 */
export declare function calculateETA(distanceKm: number, speedKph: number): number;
/**
 * Format ETA for display
 */
export declare function formatETA(minutes: number): string;
/**
 * Debounce function to limit execution rate
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
/**
 * Throttle function to limit execution frequency
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void;
/**
 * Validate coordinate bounds
 */
export declare function isValidCoordinate(lat: number, lon: number): boolean;
/**
 * Check if coordinate is within Philippines bounds
 */
export declare function isInPhilippines(lat: number, lon: number): boolean;
