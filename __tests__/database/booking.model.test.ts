import { Types } from 'mongoose';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    models: {},
  };
});

describe('Booking Model', () => {
  let BookingModel: any;
  let mockModel: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    const mongoose = require('mongoose');
    mockModel = jest.fn((name, schema) => {
      return { name, schema };
    });
    mongoose.model = mockModel;
    mongoose.models = {};
  });

  describe('Schema Definition', () => {
    beforeEach(() => {
      BookingModel = require('../../database/booking.model');
    });

    it('should define all required fields', () => {
      expect(mockModel).toHaveBeenCalled();
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj).toHaveProperty('eventId');
      expect(schema.obj).toHaveProperty('email');
    });

    it('should set eventId as ObjectId reference to Event', () => {
      const schema = mockModel.mock.calls[0][1];
      const mongoose = require('mongoose');
      
      expect(schema.obj.eventId.type).toBe(mongoose.Schema.Types.ObjectId);
      expect(schema.obj.eventId.ref).toBe('Event');
      expect(schema.obj.eventId.required).toEqual([true, 'Event ID is required']);
    });

    it('should configure email field correctly', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.email.type).toBe(String);
      expect(schema.obj.email.required).toEqual([true, 'Email is required']);
      expect(schema.obj.email.trim).toBe(true);
      expect(schema.obj.email.lowercase).toBe(true);
    });

    it('should enable timestamps', () => {
      const schema = mockModel.mock.calls[0][1];
      expect(schema.options.timestamps).toBe(true);
    });
  });

  describe('Email Validation', () => {
    beforeEach(() => {
      BookingModel = require('../../database/booking.model');
    });

    it('should validate correct email addresses', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.validator('test@example.com')).toBe(true);
      expect(emailValidator.validator('user.name@domain.co.uk')).toBe(true);
      expect(emailValidator.validator('user+tag@example.com')).toBe(true);
      expect(emailValidator.validator('user_123@test-domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.validator('invalid')).toBe(false);
      expect(emailValidator.validator('invalid@')).toBe(false);
      expect(emailValidator.validator('@example.com')).toBe(false);
      expect(emailValidator.validator('user@')).toBe(false);
      expect(emailValidator.validator('user@domain')).toBe(false);
      expect(emailValidator.validator('user domain@example.com')).toBe(false);
      expect(emailValidator.validator('')).toBe(false);
    });

    it('should have correct validation message', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.message).toBe('Please provide a valid email address');
    });

    it('should handle edge case email formats', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.validator('a@b.c')).toBe(true);
      expect(emailValidator.validator('1234567890@example.com')).toBe(true);
      expect(emailValidator.validator('email@subdomain.example.com')).toBe(true);
      expect(emailValidator.validator('_@example.com')).toBe(true);
    });

    it('should reject emails with spaces', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.validator('test @example.com')).toBe(false);
      expect(emailValidator.validator('test@ example.com')).toBe(false);
      expect(emailValidator.validator('test@example .com')).toBe(false);
    });

    it('should reject emails with multiple @ symbols', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      expect(emailValidator.validator('test@@example.com')).toBe(false);
      expect(emailValidator.validator('test@test@example.com')).toBe(false);
    });
  });

  describe('Pre-save Hook - Event Validation', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;
    let mockEventModel: any;

    beforeEach(() => {
      jest.resetModules();
      
      const mongoose = require('mongoose');
      mockModel = jest.fn((name, schema) => {
        return { name, schema };
      });
      mongoose.model = mockModel;
      mongoose.models = {};
      
      mockEventModel = {
        exists: jest.fn(),
      };
      
      BookingModel = require('../../database/booking.model');
      const schema = mockModel.mock.calls[0][1];
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        eventId: new Types.ObjectId(),
        email: 'test@example.com',
        isNew: true,
        isModified: jest.fn(),
      };
    });

    it('should validate event exists for new booking', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockResolvedValueOnce(true);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(mockEventModel.exists).toHaveBeenCalledWith({ _id: mockDoc.eventId });
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should validate event exists when eventId is modified', async () => {
      mockDoc.isNew = false;
      mockDoc.isModified.mockImplementation((field: string) => field === 'eventId');
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockResolvedValueOnce(true);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(mockEventModel.exists).toHaveBeenCalledWith({ _id: mockDoc.eventId });
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should call next with error if event does not exist', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockResolvedValueOnce(null);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Event validation failed: Event not found'),
        })
      );
    });

    it('should skip validation if eventId is not new or modified', async () => {
      mockDoc.isNew = false;
      mockDoc.isModified.mockReturnValue(false);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(mockEventModel.exists).not.toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should handle database errors gracefully', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockRejectedValueOnce(new Error('Database connection failed'));
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Event validation failed: Database connection failed'),
        })
      );
    });

    it('should handle non-Error exceptions', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockRejectedValueOnce('String error');
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Event validation failed',
        })
      );
    });

    it('should dynamically import Event model if not in models cache', async () => {
      mockDoc.isNew = true;
      mongoose.models = {};
      
      // Mock dynamic import
      jest.doMock('../../database/event.model', () => ({
        default: mockEventModel,
      }));
      
      mockEventModel.exists.mockResolvedValueOnce(true);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      // Should proceed without error
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should validate eventId when modified from null', async () => {
      mockDoc.isNew = false;
      mockDoc.isModified.mockImplementation((field: string) => field === 'eventId');
      mockDoc.eventId = new Types.ObjectId();
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockResolvedValueOnce(true);
      
      await preSaveHook.call(mockDoc, nextFn);
      
      expect(mockEventModel.exists).toHaveBeenCalled();
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('Schema Indexes', () => {
    beforeEach(() => {
      BookingModel = require('../../database/booking.model');
    });

    it('should create index on eventId', () => {
      const schema = mockModel.mock.calls[0][1];
      const indexes = schema.indexes();
      
      const eventIdIndex = indexes.find((idx: any) => idx[0].eventId === 1);
      expect(eventIdIndex).toBeDefined();
    });
  });

  describe('Model Registration', () => {
    it('should create new model if not exists in models cache', () => {
      const mongoose = require('mongoose');
      mongoose.models = {};
      
      BookingModel = require('../../database/booking.model');
      
      expect(mockModel).toHaveBeenCalledWith('Booking', expect.any(Object));
    });

    it('should reuse existing model from models cache', () => {
      const mongoose = require('mongoose');
      const existingModel = { name: 'Booking' };
      mongoose.models = { Booking: existingModel };
      
      jest.resetModules();
      BookingModel = require('../../database/booking.model');
      
      expect(BookingModel.default).toBe(existingModel);
    });
  });

  describe('TypeScript Interface', () => {
    it('should export IBooking interface', () => {
      const module = require('../../database/booking.model');
      expect(module).toHaveProperty('IBooking');
    });
  });

  describe('Edge Cases', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;
    let mockEventModel: any;

    beforeEach(() => {
      jest.resetModules();
      
      const mongoose = require('mongoose');
      mockModel = jest.fn((name, schema) => {
        return { name, schema };
      });
      mongoose.model = mockModel;
      mongoose.models = {};
      
      mockEventModel = {
        exists: jest.fn(),
      };
      
      BookingModel = require('../../database/booking.model');
      const schema = mockModel.mock.calls[0][1];
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        eventId: new Types.ObjectId(),
        email: 'test@example.com',
        isNew: false,
        isModified: jest.fn(),
      };
    });

    it('should handle concurrent validation requests', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      mockEventModel.exists.mockResolvedValue(true);
      
      const promises = [
        preSaveHook.call(mockDoc, jest.fn()),
        preSaveHook.call(mockDoc, jest.fn()),
        preSaveHook.call(mockDoc, jest.fn()),
      ];
      
      await Promise.all(promises);
      
      expect(mockEventModel.exists).toHaveBeenCalledTimes(3);
    });

    it('should handle very long email addresses', () => {
      const schema = mockModel.mock.calls[0][1];
      const emailValidator = schema.obj.email.validate;
      
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      expect(emailValidator.validator(longEmail)).toBe(true);
    });

    it('should trim and lowercase email before validation', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.email.trim).toBe(true);
      expect(schema.obj.email.lowercase).toBe(true);
    });

    it('should validate with different ObjectId formats', async () => {
      mockDoc.isNew = true;
      mongoose.models.Event = mockEventModel;
      
      const objectIds = [
        new Types.ObjectId(),
        new Types.ObjectId('507f1f77bcf86cd799439011'),
        new Types.ObjectId('000000000000000000000000'),
      ];
      
      for (const id of objectIds) {
        mockDoc.eventId = id;
        mockEventModel.exists.mockResolvedValueOnce(true);
        
        await preSaveHook.call(mockDoc, jest.fn());
        
        expect(mockEventModel.exists).toHaveBeenCalledWith({ _id: id });
      }
    });
  });
});