import { Schema } from 'mongoose';

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    model: jest.fn(),
    models: {},
  };
});

describe('Event Model', () => {
  let EventModel: any;
  let EventSchema: any;
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
      EventModel = require('../../database/event.model');
    });

    it('should define all required fields', () => {
      expect(mockModel).toHaveBeenCalled();
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj).toHaveProperty('title');
      expect(schema.obj).toHaveProperty('slug');
      expect(schema.obj).toHaveProperty('description');
      expect(schema.obj).toHaveProperty('overview');
      expect(schema.obj).toHaveProperty('image');
      expect(schema.obj).toHaveProperty('venue');
      expect(schema.obj).toHaveProperty('location');
      expect(schema.obj).toHaveProperty('date');
      expect(schema.obj).toHaveProperty('time');
      expect(schema.obj).toHaveProperty('mode');
      expect(schema.obj).toHaveProperty('audience');
      expect(schema.obj).toHaveProperty('agenda');
      expect(schema.obj).toHaveProperty('organizer');
      expect(schema.obj).toHaveProperty('tags');
    });

    it('should set correct field types', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.title.type).toBe(String);
      expect(schema.obj.slug.type).toBe(String);
      expect(schema.obj.description.type).toBe(String);
      expect(schema.obj.date.type).toBe(String);
      expect(schema.obj.time.type).toBe(String);
      expect(Array.isArray(schema.obj.agenda.type)).toBe(true);
      expect(Array.isArray(schema.obj.tags.type)).toBe(true);
    });

    it('should mark required fields correctly', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.title.required).toEqual([true, 'Title is required']);
      expect(schema.obj.description.required).toEqual([true, 'Description is required']);
      expect(schema.obj.overview.required).toEqual([true, 'Overview is required']);
      expect(schema.obj.image.required).toEqual([true, 'Image is required']);
      expect(schema.obj.venue.required).toEqual([true, 'Venue is required']);
      expect(schema.obj.location.required).toEqual([true, 'Location is required']);
      expect(schema.obj.date.required).toEqual([true, 'Date is required']);
      expect(schema.obj.time.required).toEqual([true, 'Time is required']);
    });

    it('should enable timestamps', () => {
      const schema = mockModel.mock.calls[0][1];
      expect(schema.options.timestamps).toBe(true);
    });

    it('should set slug as unique, lowercase, and trimmed', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.slug.unique).toBe(true);
      expect(schema.obj.slug.lowercase).toBe(true);
      expect(schema.obj.slug.trim).toBe(true);
    });

    it('should trim string fields', () => {
      const schema = mockModel.mock.calls[0][1];
      
      expect(schema.obj.title.trim).toBe(true);
      expect(schema.obj.description.trim).toBe(true);
      expect(schema.obj.venue.trim).toBe(true);
    });
  });

  describe('Agenda Validation', () => {
    beforeEach(() => {
      EventModel = require('../../database/event.model');
    });

    it('should validate that agenda is an array with at least one item', () => {
      const schema = mockModel.mock.calls[0][1];
      const agendaValidator = schema.obj.agenda.validate;
      
      expect(agendaValidator.validator(['Item 1'])).toBe(true);
      expect(agendaValidator.validator(['Item 1', 'Item 2'])).toBe(true);
      expect(agendaValidator.validator([])).toBe(false);
      expect(agendaValidator.validator(null as any)).toBe(false);
      expect(agendaValidator.validator('not an array' as any)).toBe(false);
    });

    it('should have correct validation message for agenda', () => {
      const schema = mockModel.mock.calls[0][1];
      const agendaValidator = schema.obj.agenda.validate;
      
      expect(agendaValidator.message).toBe('Agenda must contain at least one item');
    });
  });

  describe('Tags Validation', () => {
    beforeEach(() => {
      EventModel = require('../../database/event.model');
    });

    it('should validate that tags array has at least one item', () => {
      const schema = mockModel.mock.calls[0][1];
      const tagsValidator = schema.obj.tags.validate;
      
      expect(tagsValidator.validator(['tag1'])).toBe(true);
      expect(tagsValidator.validator(['tag1', 'tag2', 'tag3'])).toBe(true);
      expect(tagsValidator.validator([])).toBe(false);
      expect(tagsValidator.validator(null as any)).toBe(false);
      expect(tagsValidator.validator('not an array' as any)).toBe(false);
    });

    it('should have correct validation message for tags', () => {
      const schema = mockModel.mock.calls[0][1];
      const tagsValidator = schema.obj.tags.validate;
      
      expect(tagsValidator.message).toBe('At least one tag is required');
    });
  });

  describe('Slug Generation Pre-save Hook', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;

    beforeEach(() => {
      EventModel = require('../../database/event.model');
      const schema = mockModel.mock.calls[0][1];
      
      // Find the pre-save hook
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        title: 'Test Event',
        slug: '',
        isModified: jest.fn(),
      };
    });

    it('should generate slug from title when title is modified', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'My Awesome Event 2024';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('my-awesome-event-2024');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should remove special characters when generating slug', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'Event @ 2024! #Special';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('event-2024-special');
    });

    it('should replace multiple spaces with single hyphen', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'Event    With     Spaces';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('event-with-spaces');
    });

    it('should replace multiple hyphens with single hyphen', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'Event---With---Hyphens';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('event-with-hyphens');
    });

    it('should convert to lowercase', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'UPPERCASE EVENT TITLE';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('uppercase-event-title');
    });

    it('should trim whitespace', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = '  Event With Spaces  ';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('event-with-spaces');
    });

    it('should not regenerate slug if title is not modified', () => {
      mockDoc.isModified.mockReturnValue(false);
      mockDoc.slug = 'existing-slug';
      mockDoc.title = 'Changed Title';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('existing-slug');
    });

    it('should handle empty title gracefully', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = '';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('');
    });

    it('should handle title with only special characters', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = '@#$%^&*()';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('');
    });
  });

  describe('Date Normalization Pre-save Hook', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;

    beforeEach(() => {
      EventModel = require('../../database/event.model');
      const schema = mockModel.mock.calls[0][1];
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        title: 'Test Event',
        date: '2024-12-25',
        time: '14:30',
        isModified: jest.fn(),
      };
    });

    it('should normalize valid date to ISO format', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = '2024-12-25T10:30:00';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.date).toBe('2024-12-25');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should handle various date string formats', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = 'December 25, 2024';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.date).toBe('2024-12-25');
    });

    it('should call next with error for invalid date', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = 'invalid-date';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(new Error('Date must be a valid date'));
    });

    it('should not modify date if not changed', () => {
      mockDoc.isModified.mockImplementation((field: string) => field !== 'date');
      const originalDate = '2024-12-25';
      mockDoc.date = originalDate;
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.date).toBe(originalDate);
    });

    it('should handle Date objects', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = new Date('2024-12-25T00:00:00Z');
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.date).toBe('2024-12-25');
    });
  });

  describe('Time Validation Pre-save Hook', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;

    beforeEach(() => {
      EventModel = require('../../database/event.model');
      const schema = mockModel.mock.calls[0][1];
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        title: 'Test Event',
        date: '2024-12-25',
        time: '14:30',
        isModified: jest.fn(),
      };
    });

    it('should accept valid time in HH:MM format', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '14:30';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should accept time with single digit hour', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '9:30';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should accept midnight (00:00)', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '0:00';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should accept end of day (23:59)', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '23:59';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject invalid time format', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '25:00';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(new Error('Time must be in HH:MM format'));
    });

    it('should reject time with invalid minutes', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '14:60';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(new Error('Time must be in HH:MM format'));
    });

    it('should reject time without colon', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'time');
      mockDoc.time = '1430';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(new Error('Time must be in HH:MM format'));
    });

    it('should not validate time if not modified', () => {
      mockDoc.isModified.mockImplementation((field: string) => field !== 'time');
      mockDoc.time = 'invalid';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith();
    });
  });

  describe('Schema Indexes', () => {
    beforeEach(() => {
      EventModel = require('../../database/event.model');
    });

    it('should create unique index on slug', () => {
      const schema = mockModel.mock.calls[0][1];
      const indexes = schema.indexes();
      
      const slugIndex = indexes.find((idx: any) => idx[0].slug === 1);
      expect(slugIndex).toBeDefined();
      expect(slugIndex[1].unique).toBe(true);
    });
  });

  describe('Model Registration', () => {
    it('should create new model if not exists in models cache', () => {
      const mongoose = require('mongoose');
      mongoose.models = {};
      
      EventModel = require('../../database/event.model');
      
      expect(mockModel).toHaveBeenCalledWith('Event', expect.any(Object));
    });

    it('should reuse existing model from models cache', () => {
      const mongoose = require('mongoose');
      const existingModel = { name: 'Event' };
      mongoose.models = { Event: existingModel };
      
      jest.resetModules();
      EventModel = require('../../database/event.model');
      
      expect(EventModel.default).toBe(existingModel);
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    let preSaveHook: Function;
    let mockDoc: any;
    let nextFn: jest.Mock;

    beforeEach(() => {
      EventModel = require('../../database/event.model');
      const schema = mockModel.mock.calls[0][1];
      preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      nextFn = jest.fn();
      mockDoc = {
        title: 'Test Event',
        date: '2024-12-25',
        time: '14:30',
        isModified: jest.fn(),
      };
    });

    it('should handle all fields being modified simultaneously', () => {
      mockDoc.isModified.mockReturnValue(true);
      mockDoc.title = 'New Event Title!';
      mockDoc.date = '2024-12-31';
      mockDoc.time = '23:59';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toBe('new-event-title');
      expect(mockDoc.date).toBe('2024-12-31');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should handle unicode characters in title', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'title');
      mockDoc.title = 'Événement Spécial 2024 🎉';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.slug).toMatch(/vnement-spcial-2024/);
    });

    it('should handle leap year dates', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = '2024-02-29';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(mockDoc.date).toBe('2024-02-29');
      expect(nextFn).toHaveBeenCalledWith();
    });

    it('should reject invalid leap year date', () => {
      mockDoc.isModified.mockImplementation((field: string) => field === 'date');
      mockDoc.date = '2023-02-29';
      
      preSaveHook.call(mockDoc, nextFn);
      
      expect(nextFn).toHaveBeenCalledWith(new Error('Date must be a valid date'));
    });
  });
});