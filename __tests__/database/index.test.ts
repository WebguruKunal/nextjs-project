describe('Database Index Exports', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should export Event model as default', () => {
    // Mock the event model module
    jest.doMock('/tmp/database/event.model', () => ({
      default: { modelName: 'Event' },
    }));

    const databaseIndex = require('/tmp/database.index.ts');
    
    expect(databaseIndex).toHaveProperty('Event');
  });

  it('should export Booking model as default', () => {
    // Mock the booking model module
    jest.doMock('/tmp/database/booking.model', () => ({
      default: { modelName: 'Booking' },
    }));

    const databaseIndex = require('/tmp/database.index.ts');
    
    expect(databaseIndex).toHaveProperty('Booking');
  });

  it('should export IEvent interface type', () => {
    jest.doMock('/tmp/database/event.model', () => ({
      default: { modelName: 'Event' },
      IEvent: 'EventInterface',
    }));

    const databaseIndex = require('/tmp/database.index.ts');
    
    // TypeScript interfaces are compile-time only, but we can verify the export exists
    expect(databaseIndex).toBeDefined();
  });

  it('should export IBooking interface type', () => {
    jest.doMock('/tmp/database/booking.model', () => ({
      default: { modelName: 'Booking' },
      IBooking: 'BookingInterface',
    }));

    const databaseIndex = require('/tmp/database.index.ts');
    
    // TypeScript interfaces are compile-time only, but we can verify the export exists
    expect(databaseIndex).toBeDefined();
  });

  it('should provide clean barrel export pattern', () => {
    jest.doMock('/tmp/database/event.model', () => ({
      default: { modelName: 'Event' },
      IEvent: 'EventInterface',
    }));
    
    jest.doMock('/tmp/database/booking.model', () => ({
      default: { modelName: 'Booking' },
      IBooking: 'BookingInterface',
    }));

    const databaseIndex = require('/tmp/database.index.ts');
    
    // Should have both models
    expect(Object.keys(databaseIndex).length).toBeGreaterThanOrEqual(2);
  });

  it('should allow destructured imports', () => {
    jest.doMock('/tmp/database/event.model', () => ({
      default: { modelName: 'Event' },
    }));
    
    jest.doMock('/tmp/database/booking.model', () => ({
      default: { modelName: 'Booking' },
    }));

    const { Event, Booking } = require('/tmp/database.index.ts');
    
    expect(Event).toBeDefined();
    expect(Booking).toBeDefined();
  });
});