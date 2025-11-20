/**
 * Reverse geocoding utility to convert GPS coordinates to location names
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 */

interface GeocodeResult {
	location: string | null;
	error?: string;
}

/**
 * Convert GPS coordinates to a human-readable location name
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param lang - Language code for location names (default: 'vi' for Vietnamese)
 * @returns Promise with location name or null if geocoding fails
 */
export async function reverseGeocode(
	latitude: number,
	longitude: number,
	lang: string = 'vi'
): Promise<GeocodeResult> {
	try {
		// OpenStreetMap Nominatim reverse geocoding API
		// Free service, no API key required
		// Rate limit: 1 request per second (we'll add a delay if needed)
		const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${lang}&addressdetails=1&zoom=18`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'User-Agent': 'PhotoAppWeb/1.0', // Nominatim requires a valid User-Agent
			},
		});

		if (!response.ok) {
			throw new Error(`Geocoding API error: ${response.status}`);
		}

		const data = await response.json();

		if (!data || !data.address) {
			return { location: null, error: 'No address found' };
		}

		// Extract location name from address components
		// Format: City, Region, Country (in Vietnamese if available)
		const address = data.address;
		const locationParts: string[] = [];

		// Priority order for location components (in Vietnamese)
		if (address.city || address.town || address.village) {
			locationParts.push(address.city || address.town || address.village);
		}

		if (address.state || address.region) {
			locationParts.push(address.state || address.region);
		}

		// If no city/town found, try other options
		if (locationParts.length === 0) {
			if (address.suburb || address.neighbourhood) {
				locationParts.push(address.suburb || address.neighbourhood);
			}
			if (address.county) {
				locationParts.push(address.county);
			}
			if (address.state || address.region) {
				locationParts.push(address.state || address.region);
			}
		}

		// Add country if not already in Vietnamese format
		if (address.country && !locationParts.includes(address.country)) {
			// Map common country names to Vietnamese
			const countryMap: Record<string, string> = {
				'Vietnam': 'Việt Nam',
				'Thailand': 'Thái Lan',
				'Cambodia': 'Campuchia',
				'Laos': 'Lào',
				'China': 'Trung Quốc',
				'Japan': 'Nhật Bản',
				'Korea': 'Hàn Quốc',
				'Singapore': 'Singapore',
				'Malaysia': 'Malaysia',
				'Indonesia': 'Indonesia',
				'Philippines': 'Philippines',
			};
			const countryName = countryMap[address.country] || address.country;
			locationParts.push(countryName);
		}

		const location = locationParts.length > 0
			? locationParts.join(', ')
			: data.display_name || null;

		return { location };
	} catch (error) {
		console.warn('Reverse geocoding error:', error);
		return {
			location: null,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}

/**
 * Simple delay function to respect API rate limits
 * @param ms - Milliseconds to delay
 */
export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

