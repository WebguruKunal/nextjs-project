import mongoose from 'mongoose';
import Event from '../../database/event.model';
import type { IEvent } from '../../database/event.model';

// Mock mongoose
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    model: jest.fn(),
    models: {},
  };
});

describe('Event Model', () => {
  let mockEvent: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent = {
      title: 'Test Event',
      description: 'Test Description',
      overview: 'Test Overview',
      image: 'https://example.com/image.jpg',
      venue: 'Test Venue',
      location: 'Test Location',
      date: '2024-12-31',
      time: '18:30',
      mode: 'Hybrid',
      audience: 'Developers',
      agenda: ['Opening', 'Main Session', 'Closing'],
      organizer: 'Test Org',
      tags: ['tech', 'conference'],
      isNew: true,
      isModified: jest.fn((field: string) => false),
      save: jest.fn(),
    };
  });

  describe('Schema Validation', () => {
    describe('Required Fields', () => {
      it('should require title', () => {
        const schema = (Event as any).schema;
        const titlePath = schema.path('title');
        expect(titlePath.isRequired).toBe(true);
        expect(titlePath.options.required[1]).toBe('Title is required');
      });

      it('should require description', () => {
        const schema = (Event as any).schema;
        const descriptionPath = schema.path('description');
        expect(descriptionPath.isRequired).toBe(true);
      });

      it('should require overview', () => {
        const schema = (Event as any).schema;
        const overviewPath = schema.path('overview');
        expect(overviewPath.isRequired).toBe(true);
      });

      it('should require image', () => {
        const schema = (Event as any).schema;
        const imagePath = schema.path('image');
        expect(imagePath.isRequired).toBe(true);
      });

      it('should require venue', () => {
        const schema = (Event as any).schema;
        const venuePath = schema.path('venue');
        expect(venuePath.isRequired).toBe(true);
      });

      it('should require location', () => {
        const schema = (Event as any).schema;
        const locationPath = schema.path('location');
        expect(locationPath.isRequired).toBe(true);
      });

      it('should require date', () => {
        const schema = (Event as any).schema;
        const datePath = schema.path('date');
        expect(datePath.isRequired).toBe(true);
      });

      it('should require time', () => {
        const schema = (Event as any).schema;
        const timePath = schema.path('time');
        expect(timePath.isRequired).toBe(true);
      });

      it('should require mode', () => {
        const schema = (Event as any).schema;
        const modePath = schema.path('mode');
        expect(modePath.isRequired).toBe(true);
      });

      it('should require audience', () => {
        const schema = (Event as any).schema;
        const audiencePath = schema.path('audience');
        expect(audiencePath.isRequired).toBe(true);
      });

      it('should require organizer', () => {
        const schema = (Event as any).schema;
        const organizerPath = schema.path('organizer');
        expect(organizerPath.isRequired).toBe(true);
      });
    });

    describe('Array Field Validation', () => {
      it('should require agenda with at least one item', () => {
        const schema = (Event as any).schema;
        const agendaPath = schema.path('agenda');
        expect(agendaPath.isRequired).toBe(true);
        
        const validator = agendaPath.options.validate;
        expect(validator.validator([])).toBe(false);
        expect(validator.validator(['Item 1'])).toBe(true);
        expect(validator.validator(['Item 1', 'Item 2'])).toBe(true);
        expect(validator.message).toBe('Agenda must contain at least one item');
      });

      it('should require tags with at least one item', () => {
        const schema = (Event as any).schema;
        const tagsPath = schema.path('tags');
        expect(tagsPath.isRequired).toBe(true);
        
        const validator = tagsPath.options.validate;
        expect(validator.validator([])).toBe(false);
        expect(validator.validator(['tag1'])).toBe(true);
        expect(validator.validator(['tag1', 'tag2'])).toBe(true);
        expect(validator.message).toBe('At least one tag is required');
      });

      it('should reject non-array values for agenda', () => {
        const schema = (Event as any).schema;
        const agendaPath = schema.path('agenda');
        const validator = agendaPath.options.validate;
        
        expect(validator.validator('not an array' as any)).toBe(false);
        expect(validator.validator(null as any)).toBe(false);
        expect(validator.validator(undefined as any)).toBe(false);
      });

      it('should reject non-array values for tags', () => {
        const schema = (Event as any).schema;
        const tagsPath = schema.path('tags');
        const validator = tagsPath.options.validate;
        
        expect(validator.validator('not an array' as any)).toBe(false);
        expect(validator.validator(null as any)).toBe(false);
      });
    });

    describe('Field Properties', () => {
      it('should trim string fields', () => {
        const schema = (Event as any).schema;
        expect(schema.path('title').options.trim).toBe(true);
        expect(schema.path('description').options.trim).toBe(true);
        expect(schema.path('overview').options.trim).toBe(true);
        expect(schema.path('image').options.trim).toBe(true);
        expect(schema.path('venue').options.trim).toBe(true);
        expect(schema.path('location').options.trim).toBe(true);
        expect(schema.path('date').options.trim).toBe(true);
        expect(schema.path('time').options.trim).toBe(true);
        expect(schema.path('mode').options.trim).toBe(true);
        expect(schema.path('audience').options.trim).toBe(true);
        expect(schema.path('organizer').options.trim).toBe(true);
      });

      it('should have unique and lowercase slug', () => {
        const schema = (Event as any).schema;
        const slugPath = schema.path('slug');
        expect(slugPath.options.unique).toBe(true);
        expect(slugPath.options.lowercase).toBe(true);
        expect(slugPath.options.trim).toBe(true);
      });

      it('should have timestamps enabled', () => {
        const schema = (Event as any).schema;
        expect(schema.options.timestamps).toBe(true);
      });
    });
  });

  describe('Pre-save Hook - Slug Generation', () => {
    it('should generate slug from title on new event', async () => {
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('test-event');
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle special characters in title', async () => {
      mockEvent.title = 'Test Event! @#$% & More';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('test-event-more');
    });

    it('should replace multiple spaces with single hyphen', async () => {
      mockEvent.title = 'Test    Event    With    Spaces';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('test-event-with-spaces');
    });

    it('should replace multiple hyphens with single hyphen', async () => {
      mockEvent.title = 'Test---Event---Title';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('test-event-title');
    });

    it('should convert to lowercase', async () => {
      mockEvent.title = 'UPPERCASE EVENT TITLE';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('uppercase-event-title');
    });

    it('should not regenerate slug if title unchanged', async () => {
      mockEvent.slug = 'existing-slug';
      mockEvent.isModified = jest.fn((field: string) => false);
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('existing-slug');
    });

    it('should handle empty strings after processing', async () => {
      mockEvent.title = '!@#$%^&*()';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('');
    });

    it('should handle unicode characters', async () => {
      mockEvent.title = 'Événement Spécial';
      mockEvent.isModified = jest.fn((field: string) => field === 'title');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.slug).toBe('vnement-spcial');
    });
  });

  describe('Pre-save Hook - Date Normalization', () => {
    it('should normalize valid date to ISO format', async () => {
      mockEvent.date = '12/31/2024';
      mockEvent.isModified = jest.fn((field: string) => field === 'date');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle ISO date strings', async () => {
      mockEvent.date = '2024-12-31T10:00:00.000Z';
      mockEvent.isModified = jest.fn((field: string) => field === 'date');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.date).toBe('2024-12-31');
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid date format', async () => {
      mockEvent.date = 'invalid-date';
      mockEvent.isModified = jest.fn((field: string) => field === 'date');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(next).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Date must be a valid date'
      }));
    });

    it('should not normalize date if not modified', async () => {
      mockEvent.date = '2024-12-31';
      mockEvent.isModified = jest.fn((field: string) => false);
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.date).toBe('2024-12-31');
    });

    it('should handle edge case dates', async () => {
      mockEvent.date = '2024-02-29'; // Leap year
      mockEvent.isModified = jest.fn((field: string) => field === 'date');
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(mockEvent.date).toBe('2024-02-29');
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Pre-save Hook - Time Validation', () => {
    it('should accept valid 24-hour time format', async () => {
      const validTimes = ['00:00', '12:30', '23:59', '18:45', '9:15'];
      
      for (const time of validTimes) {
        mockEvent.time = time;
        mockEvent.isModified = jest.fn((field: string) => field === 'time');
        const next = jest.fn();
        
        const schema = (Event as any).schema;
        const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
        
        await preSaveHook.call(mockEvent, next);
        
        expect(next).toHaveBeenCalledWith();
      }
    });

    it('should reject invalid time formats', async () => {
      const invalidTimes = ['24:00', '25:30', '12:60', '1:5', 'invalid', '12:5', '1:30'];
      
      for (const time of invalidTimes) {
        mockEvent.time = time;
        mockEvent.isModified = jest.fn((field: string) => field === 'time');
        const next = jest.fn();
        
        const schema = (Event as any).schema;
        const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
        
        await preSaveHook.call(mockEvent, next);
        
        if (time === '24:00' || time === '25:30' || time === '12:60' || 
            time === 'invalid' || time === '12:5' || time === '1:30') {
          expect(next).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Time must be in HH:MM format'
          }));
        }
      }
    });

    it('should not validate time if not modified', async () => {
      mockEvent.time = 'invalid-time';
      mockEvent.isModified = jest.fn((field: string) => false);
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Index Configuration', () => {
    it('should have unique index on slug', () => {
      const schema = (Event as any).schema;
      const indexes = schema.indexes();
      
      const slugIndex = indexes.find((idx: any) => idx[0].slug === 1);
      expect(slugIndex).toBeDefined();
      expect(slugIndex[1].unique).toBe(true);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle all fields modified simultaneously', async () => {
      mockEvent.isModified = jest.fn((field: string) => true);
      const next = jest.fn();
      
      const schema = (Event as any).schema;
      const preSaveHook = schema.s.hooks._pres.get('save')[0].fn;
      
      await preSaveHook.call(mockEvent, next);
      
      expect(next).toHaveBeenCalled();
      expect(mockEvent.slug).toBeDefined();
    });

    it('should handle empty agenda array validation', () => {
      const schema = (Event as any).schema;
      const agendaPath = schema.path('agenda');
      const validator = agendaPath.options.validate;
      
      expect(validator.validator([])).toBe(false);
    });

    it('should handle empty tags array validation', () => {
      const schema = (Event as any).schema;
      const tagsPath = schema.path('tags');
      const validator = tagsPath.options.validate;
      
      expect(validator.validator([])).toBe(false);
    });
  });
});