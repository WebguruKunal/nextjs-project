import mongoose from 'mongoose';

// Mock mongoose before importing the model
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
  let eventSchema: any;
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
    eventSchema = mockSchema;

    // Mock model function
    (mongoose.model as jest.Mock).mockImplementation((name: string) => {
      return { modelName: name };
    });

    // Clear the module cache and re-import
    jest.resetModules();
  });

  describe('Schema Definition', () => {
    it('should create a schema with all required fields', () => {
      // Import after mocking
      require('/tmp/event.model.ts');
      
      expect(mongoose.Schema).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.objectContaining({
            type: String,
            required: [true, 'Title is required'],
            trim: true,
          }),
          description: expect.objectContaining({
            type: String,
            required: [true, 'Description is required'],
          }),
          overview: expect.objectContaining({
            type: String,
            required: [true, 'Overview is required'],
          }),
        }),
        expect.objectContaining({
          timestamps: true,
        })
      );
    });

    it('should configure slug field as unique and lowercase', () => {
      require('/tmp/event.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      expect(schemaCall.slug).toEqual({
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
      });
    });

    it('should validate agenda array is not empty', () => {
      require('/tmp/event.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      const agendaValidator = schemaCall.agenda.validate.validator;
      
      expect(agendaValidator(['item1'])).toBe(true);
      expect(agendaValidator([])).toBe(false);
      expect(agendaValidator(null)).toBe(false);
    });

    it('should validate tags array is not empty', () => {
      require('/tmp/event.model.ts');
      
      const schemaCall = (mongoose.Schema as jest.Mock).mock.calls[0][0];
      const tagsValidator = schemaCall.tags.validate.validator;
      
      expect(tagsValidator(['tag1', 'tag2'])).toBe(true);
      expect(tagsValidator(['tag1'])).toBe(true);
      expect(tagsValidator([])).toBe(false);
    });

    it('should create an index on slug field', () => {
      require('/tmp/event.model.ts');
      
      expect(eventSchema.index).toHaveBeenCalledWith(
        { slug: 1 },
        { unique: true }
      );
    });
  });

  describe('Pre-save Hook - Slug Generation', () => {
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = {
        title: '',
        slug: '',
        date: '',
        time: '',
        isModified: jest.fn(),
      };
    });

    it('should generate slug from title when title is modified', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'My Awesome Event';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('my-awesome-event');
      expect(next).toHaveBeenCalled();
    });

    it('should handle special characters in title', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'Event @ 2024: Amazing!';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('event-2024-amazing');
    });

    it('should replace multiple spaces with single hyphen', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'Event    With     Many    Spaces';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('event-with-many-spaces');
    });

    it('should replace multiple hyphens with single hyphen', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'Event---With---Hyphens';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('event-with-hyphens');
    });

    it('should not regenerate slug when title is not modified', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.slug = 'existing-slug';
      mockDoc.title = 'Different Title';
      mockDoc.isModified = jest.fn(() => false);
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('existing-slug');
    });

    it('should handle empty title gracefully', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = '';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('');
    });

    it('should trim whitespace from title', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = '  Event With Spaces  ';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('event-with-spaces');
    });
  });

  describe('Pre-save Hook - Date Normalization', () => {
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = {
        title: 'Test Event',
        slug: 'test-event',
        date: '',
        time: '',
        isModified: jest.fn(),
      };
    });

    it('should normalize valid date to ISO format', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.date = '2024-12-25';
      mockDoc.isModified = jest.fn((field: string) => field === 'date');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.date).toBe('2024-12-25');
      expect(next).toHaveBeenCalledWith();
    });

    it('should normalize date string with time to ISO date', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.date = '2024-12-25T10:30:00Z';
      mockDoc.isModified = jest.fn((field: string) => field === 'date');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.date).toBe('2024-12-25');
    });

    it('should reject invalid date format', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.date = 'invalid-date';
      mockDoc.isModified = jest.fn((field: string) => field === 'date');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(next.mock.calls[0][0].message).toBe('Date must be a valid date');
    });

    it('should not validate date when not modified', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.date = 'invalid-date';
      mockDoc.isModified = jest.fn((field: string) => field !== 'date');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      // Should not throw error since date is not modified
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle various date formats', () => {
      require('/tmp/event.model.ts');
      
      const testDates = [
        { input: '12/25/2024', expected: '2024-12-25' },
        { input: 'December 25, 2024', expected: '2024-12-25' },
        { input: '2024-01-01', expected: '2024-01-01' },
      ];

      testDates.forEach(({ input, expected }) => {
        mockDoc.date = input;
        mockDoc.isModified = jest.fn((field: string) => field === 'date');
        
        const next = jest.fn();
        preSaveHook.call(mockDoc, next);
        
        expect(mockDoc.date).toBe(expected);
      });
    });
  });

  describe('Pre-save Hook - Time Validation', () => {
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = {
        title: 'Test Event',
        slug: 'test-event',
        date: '2024-12-25',
        time: '',
        isModified: jest.fn(),
      };
    });

    it('should accept valid time in HH:MM format', () => {
      require('/tmp/event.model.ts');
      
      const validTimes = ['09:30', '14:45', '23:59', '00:00', '12:00'];
      
      validTimes.forEach((time) => {
        mockDoc.time = time;
        mockDoc.isModified = jest.fn((field: string) => field === 'time');
        
        const next = jest.fn();
        preSaveHook.call(mockDoc, next);
        
        expect(next).toHaveBeenCalledWith();
      });
    });

    it('should accept single digit hours', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.time = '9:30';
      mockDoc.isModified = jest.fn((field: string) => field === 'time');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject invalid time format', () => {
      require('/tmp/event.model.ts');
      
      const invalidTimes = [
        '25:00', // Invalid hour
        '12:60', // Invalid minute
        '1:5', // Missing leading zero on minute
        '12:5', // Missing leading zero on minute
        '24:00', // 24-hour format boundary
        'invalid',
        '12',
      ];

      invalidTimes.forEach((time) => {
        mockDoc.time = time;
        mockDoc.isModified = jest.fn((field: string) => field === 'time');
        
        const next = jest.fn();
        preSaveHook.call(mockDoc, next);
        
        expect(next).toHaveBeenCalledWith(expect.any(Error));
        expect(next.mock.calls[0][0].message).toBe('Time must be in HH:MM format');
      });
    });

    it('should not validate time when not modified', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.time = 'invalid';
      mockDoc.isModified = jest.fn((field: string) => field !== 'time');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('Combined Pre-save Hooks', () => {
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = {
        title: 'Annual Tech Conference 2024',
        slug: '',
        date: '2024-06-15',
        time: '14:30',
        isModified: jest.fn((field: string) => {
          return ['title', 'date', 'time'].includes(field);
        }),
      };
    });

    it('should process all validations when all fields are modified', () => {
      require('/tmp/event.model.ts');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('annual-tech-conference-2024');
      expect(mockDoc.date).toBe('2024-06-15');
      expect(next).toHaveBeenCalledWith();
    });

    it('should stop on first error', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.date = 'invalid-date';
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Model Registration', () => {
    it('should register model with mongoose', () => {
      require('/tmp/event.model.ts');
      
      expect(mongoose.model).toHaveBeenCalledWith('Event', expect.anything());
    });

    it('should use existing model if already registered', () => {
      mongoose.models.Event = { modelName: 'Event' };
      
      const result = require('/tmp/event.model.ts').default;
      
      expect(result).toBe(mongoose.models.Event);
    });
  });

  describe('Edge Cases', () => {
    let mockDoc: any;

    beforeEach(() => {
      mockDoc = {
        title: '',
        slug: '',
        date: '',
        time: '',
        isModified: jest.fn(),
      };
    });

    it('should handle unicode characters in title', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'Événement spécial 2024 🎉';
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBeTruthy();
      expect(mockDoc.slug).not.toContain('🎉');
    });

    it('should handle very long titles', () => {
      require('/tmp/event.model.ts');
      
      mockDoc.title = 'A'.repeat(200);
      mockDoc.isModified = jest.fn((field: string) => field === 'title');
      
      const next = jest.fn();
      preSaveHook.call(mockDoc, next);
      
      expect(mockDoc.slug).toBe('a'.repeat(200));
    });

    it('should handle date at year boundaries', () => {
      require('/tmp/event.model.ts');
      
      const boundaryDates = [
        '2024-01-01',
        '2024-12-31',
        '2000-02-29', // Leap year
      ];

      boundaryDates.forEach((date) => {
        mockDoc.date = date;
        mockDoc.isModified = jest.fn((field: string) => field === 'date');
        
        const next = jest.fn();
        preSaveHook.call(mockDoc, next);
        
        expect(next).toHaveBeenCalledWith();
      });
    });

    it('should handle midnight and noon times', () => {
      require('/tmp/event.model.ts');
      
      ['00:00', '12:00', '23:59'].forEach((time) => {
        mockDoc.time = time;
        mockDoc.isModified = jest.fn((field: string) => field === 'time');
        
        const next = jest.fn();
        preSaveHook.call(mockDoc, next);
        
        expect(next).toHaveBeenCalledWith();
      });
    });
  });
});