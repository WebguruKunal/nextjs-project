describe('Database Index Module', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('Module Exports', () => {
    it('should export Event model as default', () => {
      jest.mock('../../database/event.model', () => ({
        default: { name: 'Event' },
        IEvent: {},
      }));
      
      const dbIndex = require('../../database/index');
      
      expect(dbIndex).toHaveProperty('Event');
      expect(dbIndex.Event).toEqual({ name: 'Event' });
    });

    it('should export Booking model as default', () => {
      jest.mock('../../database/booking.model', () => ({
        default: { name: 'Booking' },
        IBooking: {},
      }));
      
      const dbIndex = require('../../database/index');
      
      expect(dbIndex).toHaveProperty('Booking');
      expect(dbIndex.Booking).toEqual({ name: 'Booking' });
    });

    it('should export IEvent interface type', () => {
      jest.mock('../../database/event.model', () => ({
        default: { name: 'Event' },
        IEvent: {},
      }));
      
      const dbIndex = require('../../database/index');
      
      expect(dbIndex).toHaveProperty('IEvent');
    });

    it('should export IBooking interface type', () => {
      jest.mock('../../database/booking.model', () => ({
        default: { name: 'Booking' },
        IBooking: {},
      }));
      
      const dbIndex = require('../../database/index');
      
      expect(dbIndex).toHaveProperty('IBooking');
    });
  });

  describe('Re-export Structure', () => {
    it('should properly re-export all models and types', () => {
      jest.mock('../../database/event.model', () => ({
        default: { name: 'Event', schema: 'eventSchema' },
        IEvent: { type: 'interface' },
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: { name: 'Booking', schema: 'bookingSchema' },
        IBooking: { type: 'interface' },
      }));
      
      const dbIndex = require('../../database/index');
      
      expect(Object.keys(dbIndex)).toEqual(
        expect.arrayContaining(['Event', 'Booking', 'IEvent', 'IBooking'])
      );
    });
  });

  describe('Module Loading', () => {
    it('should not throw errors when importing', () => {
      jest.mock('../../database/event.model', () => ({
        default: {},
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: {},
        IBooking: {},
      }));
      
      expect(() => {
        require('../../database/index');
      }).not.toThrow();
    });

    it('should handle missing dependencies gracefully', () => {
      jest.mock('../../database/event.model', () => {
        throw new Error('Module not found');
      });
      
      expect(() => {
        require('../../database/index');
      }).toThrow();
    });
  });

  describe('Type Exports', () => {
    it('should allow importing types separately', () => {
      jest.mock('../../database/event.model', () => ({
        default: { name: 'Event' },
        IEvent: { title: 'string', date: 'string' },
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: { name: 'Booking' },
        IBooking: { email: 'string', eventId: 'ObjectId' },
      }));
      
      const { IEvent, IBooking } = require('../../database/index');
      
      expect(IEvent).toBeDefined();
      expect(IBooking).toBeDefined();
    });

    it('should allow importing models separately', () => {
      jest.mock('../../database/event.model', () => ({
        default: { name: 'Event' },
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: { name: 'Booking' },
        IBooking: {},
      }));
      
      const { Event, Booking } = require('../../database/index');
      
      expect(Event).toBeDefined();
      expect(Booking).toBeDefined();
    });
  });

  describe('Import/Export Consistency', () => {
    it('should maintain model references across imports', () => {
      const mockEvent = { name: 'Event', _id: '12345' };
      const mockBooking = { name: 'Booking', _id: '67890' };
      
      jest.mock('../../database/event.model', () => ({
        default: mockEvent,
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: mockBooking,
        IBooking: {},
      }));
      
      const firstImport = require('../../database/index');
      jest.resetModules();
      
      jest.mock('../../database/event.model', () => ({
        default: mockEvent,
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: mockBooking,
        IBooking: {},
      }));
      
      const secondImport = require('../../database/index');
      
      expect(firstImport.Event).toEqual(secondImport.Event);
      expect(firstImport.Booking).toEqual(secondImport.Booking);
    });
  });

  describe('Barrel Export Pattern', () => {
    it('should follow barrel export pattern for clean imports', () => {
      jest.mock('../../database/event.model', () => ({
        default: { model: 'Event' },
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: { model: 'Booking' },
        IBooking: {},
      }));
      
      // Should allow destructured imports
      const { Event, Booking, IEvent, IBooking } = require('../../database/index');
      
      expect(Event).toEqual({ model: 'Event' });
      expect(Booking).toEqual({ model: 'Booking' });
      expect(IEvent).toBeDefined();
      expect(IBooking).toBeDefined();
    });

    it('should support namespace imports', () => {
      jest.mock('../../database/event.model', () => ({
        default: { model: 'Event' },
        IEvent: {},
      }));
      
      jest.mock('../../database/booking.model', () => ({
        default: { model: 'Booking' },
        IBooking: {},
      }));
      
      const db = require('../../database/index');
      
      expect(db.Event).toBeDefined();
      expect(db.Booking).toBeDefined();
      expect(db.IEvent).toBeDefined();
      expect(db.IBooking).toBeDefined();
    });
  });
});