import mongoose from 'mongoose';

// Mock mongoose before importing the model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    models: {},
    Schema: {
      Types: {
        ObjectId: actualMongoose.Schema.Types.ObjectId,
      },
    },
  };
});

describe('Booking Model', () => {
  let BookingModel: any;
  let bookingSchema: any;
  let preSaveHook: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Schema constructor
    const mockSchema = {
      pre: jest.fn((event: string, callback: any) => {
        if (event === 'save') {
          preSaveHook = callback;
        }
      }),
      index: jest.fn(),
    };

    (mongoose.Schema as any) = jest.fn(() => mockSchema);
    bookingSchema = mockSchema;

    // Mock model function
    (mongoose.model as jest.Mock).mockImplementation((name: string) => {
      return { modelName: name };
    });

    jest.resetModules();
  });

  describe('Schema Definition', () => {
    it('should create schema with eventId reference to Event', () => {
      require('/tmp/booking.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      expect(schemaCall.eventId).toEqual({
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: [true, 'Event ID is required'],
      });
    });

    it('should configure email field with proper validation', () => {
      require('/tmp/booking.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      expect(schemaCall.email).toMatchObject({
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
      });
    });

    it('should enable timestamps', () => {
      require('/tmp/booking.model.ts');
      
      const schemaOptions = (mongoose.Schema as jest.Mock).mock.calls[0][1];
      expect(schemaOptions.timestamps).toBe(true);
    });

    it('should create index on eventId field', () => {
      require('/tmp/booking.model.ts');
      
      expect(bookingSchema.index).toHaveBeenCalledWith({ eventId: 1 });
    });
  });

  describe('Email Validation', () => {
    let emailValidator: any;

    beforeEach(() => {
      require('/tmp/booking.model.ts');
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      emailValidator = schemaCall.email.validate.validator;
    });

    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'firstname+lastname@company.org',
        'user123@test-domain.com',
        'a@b.c',
        'name_underscore@domain.com',
      ];

      validEmails.forEach((email) => {
        expect(emailValidator(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@.com',
        'user..name@example.com',
        '',
        'user@domain',
        'user@domain.',
      ];

      invalidEmails.forEach((email) => {
        expect(emailValidator(email)).toBe(false);
      });
    });

    it('should have proper error message for invalid email', () => {
      require('/tmp/booking.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      expect(schemaCall.email.validate.message).toBe('Please provide a valid email address');
    });

    it('should handle edge case email formats', () => {
      const edgeCases = [
        { email: 'user+tag@example.com', valid: true },
        { email: 'user.name@example.com', valid: true },
        { email: 'user_name@example.com', valid: true },
        { email: 'user-name@example.com', valid: true },
        { email: 'user@sub.domain.com', valid: true },
        { email: 'user@domain.co.uk', valid: true },
      ];

      edgeCases.forEach(({ email, valid }) => {
        expect(emailValidator(email)).toBe(valid);
      });
    });
  });

  describe('Pre-save Hook - Event Validation', () => {
    let mockDoc: any;
    let mockEventModel: any;

    beforeEach(() => {
      mockDoc = {
        eventId: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        isNew: true,
        isModified: jest.fn(),
      };

      mockEventModel = {
        exists: jest.fn(),
      };

      mongoose.models.Event = mockEventModel;
    });

    it('should validate eventId exists when creating new booking', async () => {
      require('/tmp/booking.model.ts');
      
      mockEventModel.exists.mockResolvedValue(true);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(mockEventModel.exists).toHaveBeenCalledWith({ _id: mockDoc.eventId });
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail when event does not exist', async () => {
      require('/tmp/booking.model.ts');
      
      mockEventModel.exists.mockResolvedValue(false);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Event not found');
    });

    it('should validate when eventId is modified', async () => {
      require('/tmp/booking.model.ts');
      
      mockDoc.isNew = false;
      mockDoc.isModified = jest.fn((field: string) => field === 'eventId');
      mockEventModel.exists.mockResolvedValue(true);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(mockEventModel.exists).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should skip validation when eventId is not modified', async () => {
      require('/tmp/booking.model.ts');
      
      mockDoc.isNew = false;
      mockDoc.isModified = jest.fn((field: string) => field !== 'eventId');
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(mockEventModel.exists).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle errors from event lookup', async () => {
      require('/tmp/booking.model.ts');
      
      const dbError = new Error('Database connection failed');
      mockEventModel.exists.mockRejectedValue(dbError);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toContain('Event validation failed');
    });

    it('should handle non-Error exceptions', async () => {
      require('/tmp/booking.model.ts');
      
      mockEventModel.exists.mockRejectedValue('String error');
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Event validation failed');
    });

    it('should dynamically import Event model if not in models cache', async () => {
      require('/tmp/booking.model.ts');
      
      delete mongoose.models.Event;
      
      // Mock dynamic import
      jest.doMock('./event.model', () => ({
        default: mockEventModel,
      }));

      mockEventModel.exists.mockResolvedValue(true);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Model Registration', () => {
    it('should register model with mongoose', () => {
      require('/tmp/booking.model.ts');
      
      expect(mongoose.model).toHaveBeenCalledWith('Booking', expect.anything());
    });

    it('should use existing model if already registered', () => {
      mongoose.models.Booking = { modelName: 'Booking' };
      
      const result = require('/tmp/booking.model.ts').default;
      
      expect(result).toBe(mongoose.models.Booking);
    });

    it('should prevent model overwrite during hot reloads', () => {
      mongoose.models.Booking = { modelName: 'Booking', existing: true };
      
      const result = require('/tmp/booking.model.ts').default;
      
      expect(result).toHaveProperty('existing', true);
    });
  });

  describe('Interface Compliance', () => {
    it('should export IBooking interface', () => {
      const module = require('/tmp/booking.model.ts');
      
      // Interface is TypeScript compile-time, so we just verify the export exists
      expect(module).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    let mockDoc: any;
    let mockEventModel: any;

    beforeEach(() => {
      mockDoc = {
        eventId: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        isNew: true,
        isModified: jest.fn(),
      };

      mockEventModel = {
        exists: jest.fn(),
      };

      mongoose.models.Event = mockEventModel;
    });

    it('should handle null eventId', async () => {
      require('/tmp/booking.model.ts');
      
      mockDoc.eventId = null;
      mockEventModel.exists.mockResolvedValue(false);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle very long email addresses', () => {
      require('/tmp/booking.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      const emailValidator = schemaCall.email.validate.validator;
      
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      expect(emailValidator(longEmail)).toBe(true);
    });

    it('should trim and lowercase email', () => {
      require('/tmp/booking.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      expect(schemaCall.email.trim).toBe(true);
      expect(schemaCall.email.lowercase).toBe(true);
    });

    it('should handle concurrent save operations', async () => {
      require('/tmp/booking.model.ts');
      
      mockEventModel.exists.mockResolvedValue(true);
      mockDoc.isModified = jest.fn(() => false);
      
      const next1 = jest.fn();
      const next2 = jest.fn();
      
      await Promise.all([
        preSaveHook.call(mockDoc, next1),
        preSaveHook.call(mockDoc, next2),
      ]);
      
      expect(next1).toHaveBeenCalledWith();
      expect(next2).toHaveBeenCalledWith();
    });

    it('should validate with ObjectId as string', async () => {
      require('/tmp/booking.model.ts');
      
      mockDoc.eventId = '507f1f77bcf86cd799439011';
      mockEventModel.exists.mockResolvedValue(true);
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Performance Considerations', () => {
    it('should have index for faster queries on eventId', () => {
      require('/tmp/booking.model.ts');
      
      expect(bookingSchema.index).toHaveBeenCalledWith({ eventId: 1 });
    });

    it('should validate only when necessary to avoid unnecessary DB calls', async () => {
      require('/tmp/booking.model.ts');
      
      const mockEventModel = {
        exists: jest.fn().mockResolvedValue(true),
      };
      mongoose.models.Event = mockEventModel;

      const mockDoc = {
        eventId: new mongoose.Types.ObjectId(),
        email: 'test@example.com',
        isNew: false,
        isModified: jest.fn(() => false),
      };
      
      const next = jest.fn();
      await preSaveHook.call(mockDoc, next);
      
      // Should not call exists since not new and not modified
      expect(mockEventModel.exists).not.toHaveBeenCalled();
    });
  });
});