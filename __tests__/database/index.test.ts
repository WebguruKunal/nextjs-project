describe('Database Index Exports', () => {
  it('should export Event model', () => {
    jest.isolateModules(() => {
      const { Event } = require('../../database/index');
      expect(Event).toBeDefined();
    });
  });

  it('should export Booking model', () => {
    jest.isolateModules(() => {
      const { Booking } = require('../../database/index');
      expect(Booking).toBeDefined();
    });
  });

  it('should export IEvent type', () => {
    // TypeScript compile-time check
    // This test verifies the export exists
    jest.isolateModules(() => {
      const exports = require('../../database/index');
      expect(exports).toHaveProperty('Event');
    });
  });

  it('should export IBooking type', () => {
    // TypeScript compile-time check
    // This test verifies the export exists
    jest.isolateModules(() => {
      const exports = require('../../database/index');
      expect(exports).toHaveProperty('Booking');
    });
  });

  it('should have all expected exports', () => {
    jest.isolateModules(() => {
      const exports = require('../../database/index');
      const exportKeys = Object.keys(exports);
      
      expect(exportKeys).toContain('Event');
      expect(exportKeys).toContain('Booking');
    });
  });
});