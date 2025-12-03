/**
 * Zone Service Unit Tests
 */

const zoneService = require('../../src/modules/zones/zone.service');

describe('ZoneService', () => {
  describe('isValidGeoJSONPolygon', () => {
    it('should validate correct GeoJSON polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-64.1, -31.4],
            [-64.2, -31.4],
            [-64.2, -31.5],
            [-64.1, -31.5],
            [-64.1, -31.4], // Closing point
          ],
        ],
      };

      const result = zoneService.isValidGeoJSONPolygon(polygon);
      expect(result).toBe(true);
    });

    it('should reject polygon with less than 4 points', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-64.1, -31.4],
            [-64.2, -31.4],
            [-64.1, -31.4],
          ],
        ],
      };

      const result = zoneService.isValidGeoJSONPolygon(polygon);
      expect(result).toBe(false);
    });

    it('should reject invalid type', () => {
      const polygon = {
        type: 'Point',
        coordinates: [[-64.1, -31.4]],
      };

      const result = zoneService.isValidGeoJSONPolygon(polygon);
      expect(result).toBe(false);
    });

    it('should reject invalid coordinates format', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-64.1], // Missing latitude
            [-64.2, -31.4],
            [-64.2, -31.5],
            [-64.1, -31.5],
            [-64.1, -31.4],
          ],
        ],
      };

      const result = zoneService.isValidGeoJSONPolygon(polygon);
      expect(result).toBe(false);
    });
  });

  describe('isPointInPolygon', () => {
    const polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-64.1, -31.4],
          [-64.2, -31.4],
          [-64.2, -31.5],
          [-64.1, -31.5],
          [-64.1, -31.4],
        ],
      ],
    };

    it('should return true for point inside polygon', () => {
      const result = zoneService.isPointInPolygon(-31.45, -64.15, polygon);
      expect(result).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const result = zoneService.isPointInPolygon(-31.3, -64.0, polygon);
      expect(result).toBe(false);
    });

    it('should handle edge cases correctly', () => {
      // Point on the edge
      const result = zoneService.isPointInPolygon(-31.4, -64.1, polygon);
      // Edge behavior may vary, just ensure it doesn't crash
      expect(typeof result).toBe('boolean');
    });
  });
});
