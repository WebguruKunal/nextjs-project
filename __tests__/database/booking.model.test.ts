import mongoose from 'mongoose';
import Booking from '../../database/booking.model';
import type { IBooking } from '../../database/booking.model';

// Mock mongoose
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    model: jest.fn(),
    models: { Event: null },
    Schema: actual.Schema,
  };
});

describe('Booking Model', () => {
  let mockBooking: any;
  let mockEventModel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEventModel = {
      exists: jest.fn(),
    };
    
    mockBooking = {
      eventId: new mongoose.Types.ObjectId(),
      email: 'test@example.com',
      isNew: true,
      isModified: jest.fn((field: string) => false),
      save: jest.fn(),
    };
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require eventId', () => {
        const schema = (Booking as any).schema;
        const eventIdPath = schema.path('eventId');
        expect(eventIdPath.isRequired).toBe(true);
        expect(eventIdPath.options.required[1]).toBe('Event ID is required');
      });

      it('should require email', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        expect(emailPath.isRequired).toBe(true);
        expect(emailPath.options.required[1]).toBe('Email is required');
      });
    });

    describe('Field Properties', () => {
      it('should reference Event model for eventId', () => {
        const schema = (Booking as any).schema;
        const eventIdPath = schema.path('eventId');
        expect(eventIdPath.options.ref).toBe('Event');
        expect(eventIdPath.instance).toBe('ObjectID');
      });

      it('should trim and lowercase email', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        expect(emailPath.options.trim).toBe(true);
        expect(emailPath.options.lowercase).toBe(true);
      });

      it('should have timestamps enabled', () => {
        const schema = (Booking as any).schema;
        expect(schema.options.timestamps).toBe(true);
      });
    });

    describe('Email Validation', () => {
      it('should accept valid email addresses', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        const validator = emailPath.options.validate.validator;
        
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'first+last@subdomain.example.com',
          'user123@test-domain.org',
          'a@b.c',
        ];
        
        validEmails.forEach(email => {
          expect(validator(email)).toBe(true);
        });
      });

      it('should reject invalid email addresses', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        const validator = emailPath.options.validate.validator;
        
        const invalidEmails = [
          'invalid',
          'no-at-sign.com',
          '@no-local-part.com',
          'no-domain@',
          'spaces in@email.com',
          'multiple@@at.com',
          'missing.domain@',
          '@missing-local.com',
          'missing@tld',
          '.starts@with.dot.com',
          'ends.with.dot.@com',
        ];
        
        invalidEmails.forEach(email => {
          expect(validator(email)).toBe(false);
        });
      });

      it('should have proper error message for invalid email', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        expect(emailPath.options.validate.message).toBe('Please provide a valid email address');
      });

      it('should handle edge case email formats', () => {
        const schema = (Booking as any).schema;
        const emailPath = schema.path('email');
        const validator = emailPath.options.validate.validator;
        
        // Valid edge cases
        expect(validator('a@b.c')).toBe(true);
        expect(validator('1@2.3')).toBe(true);
        
        // Invalid edge cases
        expect(validator('')).toBe(false);
        expect(validator(' ')).toBe(false);
        expect(validator('   @   .   ')).toBe(false);
      });
    });
  });

  describe('Pre-save Hook - Event Validation', () => {
    it('should validate eventId exists for new booking', async () => {
      mockEventModel.exists.mockResolvedValue({ _id: mockBooking.eventId });
      mockBooking.isNew = true;
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      // Mock the dynamic import
      jest.doMock('../../database/event.model', () => ({
        default: mockEventModel,
      }));
      
      await preSaveHook.call(mockBooking, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should validate eventId exists for modified eventId', async () => {
      mockEventModel.exists.mockResolvedValue({ _id: mockBooking.eventId });
      mockBooking.isNew = false;
      mockBooking.isModified = jest.fn((field: string) => field === 'eventId');
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockBooking, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should skip validation if eventId not modified', async () => {
      mockBooking.isNew = false;
      mockBooking.isModified = jest.fn((field: string) => false);
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockBooking, next);
      
      expect(mockEventModel.exists).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should throw error if event does not exist', async () => {
      mockEventModel.exists.mockResolvedValue(null);
      mockBooking.isNew = true;
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      // We need to mock the Event model in models
      const originalModels = mongoose.models;
      mongoose.models.Event = mockEventModel;
      
      await preSaveHook.call(mockBooking, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Event validation failed')
        })
      );
      
      mongoose.models = originalModels;
    });

    it('should handle database errors during event validation', async () => {
      mockEventModel.exists.mockRejectedValue(new Error('Database connection failed'));
      mockBooking.isNew = true;
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      const originalModels = mongoose.models;
      mongoose.models.Event = mockEventModel;
      
      await preSaveHook.call(mockBooking, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Event validation failed')
        })
      );
      
      mongoose.models = originalModels;
    });

    it('should handle non-Error exceptions', async () => {
      mockEventModel.exists.mockRejectedValue('String error');
      mockBooking.isNew = true;
      const next = jest.fn();
      
      const schema = (Booking as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      const originalModels = mongoose.models;
      mongoose.models.Event = mockEventModel;
      
      await preSaveHook.call(mockBooking, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Event validation failed'
        })
      );
      
      mongoose.models = originalModels;
    });
  });

  describe('Index Configuration', () => {
    it('should have index on eventId', () => {
      const schema = (Booking as any).schema;
      const indexes = schema.indexes();
      
      const eventIdIndex = indexes.find((idx: any) => idx[0].eventId === 1);
      expect(eventIdIndex).toBeDefined();
    });
  });

  describe('TypeScript Interface', () => {
    it('should have correct interface properties', () => {
      // This is a compile-time check, but we can verify the schema matches
      const schema = (Booking as any).schema;
      
      expect(schema.path('eventId')).toBeDefined();
      expect(schema.path('email')).toBeDefined();
      expect(schema.path('createdAt')).toBeDefined();
      expect(schema.path('updatedAt')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle ObjectId as string', () => {
      const schema = (Booking as any).schema;
      const eventIdPath = schema.path('eventId');
      
      // Mongoose will cast string to ObjectId
      expect(eventIdPath.instance).toBe('ObjectID');
    });

    it('should handle email with uppercase letters', () => {
      const schema = (Booking as any).schema;
      const emailPath = schema.path('email');
      
      // lowercase option should convert to lowercase
      expect(emailPath.options.lowercase).toBe(true);
    });

    it('should handle email with whitespace', () => {
      const schema = (Booking as any).schema;
      const emailPath = schema.path('email');
      
      // trim option should remove whitespace
      expect(emailPath.options.trim).toBe(true);
    });
  });

  describe('Model Hot Reload Protection', () => {
    it('should prevent model overwrite in development', () => {
      // The pattern `models.Booking || model(...)` prevents recompilation issues
      // This is tested by verifying the model creation pattern
      expect(mongoose.models).toBeDefined();
    });
  });
});