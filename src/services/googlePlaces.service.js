/**
 * Google Places Service Adapter
 * Handles interaction with Google Places API for syncing service points.
 * Supports Mock Mode for development without API keys.
 */

const axios = require('axios');
const env = require('../config/env');
const logger = require('../config/logger');

class GooglePlacesService {
  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
    this.isMockMode = !this.apiKey || this.apiKey === 'mock';
    
    if (this.isMockMode) {
      logger.warn('GooglePlacesService initialized in MOCK MODE. No real API calls will be made.');
    }
  }

  /**
   * Search for nearby places
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @param {number} radius - Radius in meters
   * @param {string} type - Place type (e.g., 'hospital', 'lodging')
   * @returns {Promise<Array>} List of mapped service points
   */
  async searchNearbyPlaces(lat, lng, radius, type) {
    if (this.isMockMode) {
      return this._getMockData(lat, lng, type);
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          location: `${lat},${lng}`,
          radius,
          type,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API Error: ${response.data.status}`);
      }

      return this._mapResponseToServicePoints(response.data.results, type);
    } catch (error) {
      logger.error('Error searching Google Places:', error);
      throw new Error('Failed to fetch data from Google Places API');
    }
  }

  /**
   * Map Google Places response to ServicePoint format
   * @param {Array} results - Google Places results
   * @param {string} originalType - Original search type
   * @returns {Array} Mapped objects
   */
  _mapResponseToServicePoints(results, originalType) {
    return results.map(place => ({
      name: place.name,
      address: place.vicinity,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      type: this._mapGoogleTypeToServicePointType(originalType),
      description: `Imported from Google Places (Rating: ${place.rating || 'N/A'})`,
      isPublic: true,
      servicesOffered: {
        googlePlaceId: place.place_id,
        types: place.types,
        rating: place.rating,
      },
    }));
  }

  /**
   * Map Google types to ServicePointType enum
   * @param {string} googleType 
   * @returns {string} ServicePointType
   */
  _mapGoogleTypeToServicePointType(googleType) {
    const mapping = {
      'hospital': 'HEALTH_CENTER',
      'doctor': 'HEALTH_CENTER',
      'health': 'HEALTH_CENTER',
      'lodging': 'REFUGE',
      'restaurant': 'SOUP_KITCHEN', // Approximate
      'food': 'FOOD_POINT',
    };
    return mapping[googleType] || 'TEMP_SHELTER';
  }

  /**
   * Generate mock data for testing
   */
  _getMockData(lat, lng, type) {
    logger.info(`Generating mock data for ${type} near ${lat},${lng}`);
    
    // Generate 3 mock points around the center
    const mockPoints = [
      {
        name: `Mock ${type} 1`,
        vicinity: 'Calle Falsa 123',
        geometry: { location: { lat: lat + 0.001, lng: lng + 0.001 } },
        rating: 4.5,
        place_id: `mock_1_${Date.now()}`,
        types: [type, 'point_of_interest'],
      },
      {
        name: `Mock ${type} 2`,
        vicinity: 'Avenida Siempre Viva 742',
        geometry: { location: { lat: lat - 0.001, lng: lng - 0.001 } },
        rating: 3.8,
        place_id: `mock_2_${Date.now()}`,
        types: [type, 'establishment'],
      },
      {
        name: `Mock ${type} 3`,
        vicinity: 'Boulevard de los Sueños Rotos',
        geometry: { location: { lat: lat + 0.002, lng: lng - 0.002 } },
        rating: 5.0,
        place_id: `mock_3_${Date.now()}`,
        types: [type, 'health'],
      },
    ];

    return this._mapResponseToServicePoints(mockPoints, type);
  }
}

module.exports = new GooglePlacesService();
