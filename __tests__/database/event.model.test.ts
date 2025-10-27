/**
 * Comprehensive Unit Tests for database/event.model.ts
 * 
 * Tests the Event Mongoose model including:
 * - Schema validation
 * - Pre-save hooks (slug generation, date/time normalization)
 * - Field requirements and constraints
 * - Edge cases and error handling
 * - Index configuration
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Event Model', () => {
  let mongoServer: MongoMemoryServer;
  let Event: any;
  let IEvent: any;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    // Import the model after connection
    const eventModule = await import('../../database/event.model');
    Event = eventModule.default;
    IEvent = eventModule.IEvent;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all documents before each test
    await Event.deleteMany({});
  });

  describe('Schema Definition', () => {
    it('should have all required fields defined', () => {
      const schema = Event.schema;
      const paths = schema.paths;

      expect(paths.title).toBeDefined();
      expect(paths.slug).toBeDefined();
      expect(paths.description).toBeDefined();
      expect(paths.overview).toBeDefined();
      expect(paths.image).toBeDefined();
      expect(paths.venue).toBeDefined();
      expect(paths.location).toBeDefined();
      expect(paths.date).toBeDefined();
      expect(paths.time).toBeDefined();
      expect(paths.mode).toBeDefined();
      expect(paths.audience).toBeDefined();
      expect(paths.agenda).toBeDefined();
      expect(paths.organizer).toBeDefined();
      expect(paths.tags).toBeDefined();
    });

    it('should have timestamps enabled', () => {
      const schema = Event.schema;
      expect(schema.options.timestamps).toBe(true);
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });

    it('should have unique index on slug', () => {
      const indexes = Event.schema.indexes();
      const slugIndex = indexes.find((idx: any) => idx[0].slug === 1);
      
      expect(slugIndex).toBeDefined();
      expect(slugIndex[1].unique).toBe(true);
    });
  });

  describe('Required Field Validation', () => {
    it('should require title field', async () => {
      const event = new Event({
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Title is required/);
    });

    it('should require description field', async () => {
      const event = new Event({
        title: 'Test Event',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Description is required/);
    });

    it('should require overview field', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Overview is required/);
    });

    it('should require all essential fields', async () => {
      const event = new Event({});

      await expect(event.save()).rejects.toThrow();
    });
  });

  describe('String Field Trimming', () => {
    it('should trim whitespace from title', async () => {
      const event = new Event({
        title: '  Test Event  ',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.title).toBe('Test Event');
    });

    it('should trim whitespace from all string fields', async () => {
      const event = new Event({
        title: '  Test Event  ',
        description: '  Test description  ',
        overview: '  Test overview  ',
        image: '  test.jpg  ',
        venue: '  Test Venue  ',
        location: '  Test Location  ',
        date: '2024-12-01',
        time: '18:00',
        mode: '  Hybrid  ',
        audience: '  Everyone  ',
        agenda: ['Item 1'],
        organizer: '  Test Organizer  ',
        tags: ['tag1'],
      });

      await event.save();
      
      expect(event.title).toBe('Test Event');
      expect(event.description).toBe('Test description');
      expect(event.overview).toBe('Test overview');
      expect(event.image).toBe('test.jpg');
      expect(event.venue).toBe('Test Venue');
      expect(event.location).toBe('Test Location');
      expect(event.mode).toBe('Hybrid');
      expect(event.audience).toBe('Everyone');
      expect(event.organizer).toBe('Test Organizer');
    });
  });

  describe('Slug Generation', () => {
    it('should auto-generate slug from title', async () => {
      const event = new Event({
        title: 'Test Event 2024',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('test-event-2024');
    });

    it('should convert slug to lowercase', async () => {
      const event = new Event({
        title: 'TEST EVENT UPPERCASE',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('test-event-uppercase');
    });

    it('should replace spaces with hyphens in slug', async () => {
      const event = new Event({
        title: 'Multiple Word Title Here',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('multiple-word-title-here');
    });

    it('should remove special characters from slug', async () => {
      const event = new Event({
        title: 'Event @ 2024! (Special #Chars)',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('event-2024-special-chars');
    });

    it('should collapse multiple hyphens in slug', async () => {
      const event = new Event({
        title: 'Event   With    Multiple     Spaces',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('event-with-multiple-spaces');
    });

    it('should regenerate slug when title is modified', async () => {
      const event = new Event({
        title: 'Original Title',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.slug).toBe('original-title');

      event.title = 'Updated Title';
      await event.save();
      expect(event.slug).toBe('updated-title');
    });

    it('should not regenerate slug when title is not modified', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-01',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      const originalSlug = event.slug;

      event.description = 'Updated description';
      await event.save();
      expect(event.slug).toBe(originalSlug);
    });
  });

  describe('Date Normalization', () => {
    it('should normalize date to ISO format (YYYY-MM-DD)', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '12/15/2024',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should accept ISO date format', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.date).toBe('2024-12-15');
    });

    it('should reject invalid date format', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: 'invalid-date',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Date must be a valid date/);
    });

    it('should re-normalize date when modified', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      
      event.date = '01/20/2025';
      await event.save();
      expect(event.date).toMatch(/^2025-01-20$/);
    });
  });

  describe('Time Validation', () => {
    it('should accept valid time in HH:MM format', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:30',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.time).toBe('18:30');
    });

    it('should accept time with single digit hour', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '9:30',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.time).toBe('9:30');
    });

    it('should reject invalid time format', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '25:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Time must be in HH:MM format/);
    });

    it('should reject time without colon', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '1800',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Time must be in HH:MM format/);
    });

    it('should reject time with invalid minutes', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:60',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Time must be in HH:MM format/);
    });
  });

  describe('Array Field Validation', () => {
    it('should require at least one agenda item', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: [],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await expect(event.save()).rejects.toThrow(/Agenda must contain at least one item/);
    });

    it('should require at least one tag', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: [],
      });

      await expect(event.save()).rejects.toThrow(/At least one tag is required/);
    });

    it('should accept multiple agenda items', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1', 'Item 2', 'Item 3'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.agenda).toHaveLength(3);
      expect(event.agenda).toEqual(['Item 1', 'Item 2', 'Item 3']);
    });

    it('should accept multiple tags', async () => {
      const event = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1', 'tag2', 'tag3'],
      });

      await event.save();
      expect(event.tags).toHaveLength(3);
      expect(event.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });
  });

  describe('Unique Slug Constraint', () => {
    it('should enforce unique slug constraint', async () => {
      const event1 = new Event({
        title: 'Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event1.save();

      const event2 = new Event({
        title: 'Test Event', // Same title -> same slug
        description: 'Different description',
        overview: 'Different overview',
        image: 'test2.jpg',
        venue: 'Different Venue',
        location: 'Different Location',
        date: '2024-12-16',
        time: '19:00',
        mode: 'Online',
        audience: 'Members',
        agenda: ['Item 2'],
        organizer: 'Different Organizer',
        tags: ['tag2'],
      });

      await expect(event2.save()).rejects.toThrow();
    });
  });

  describe('Full Document Creation', () => {
    it('should successfully create event with all valid fields', async () => {
      const eventData = {
        title: 'Complete Test Event',
        description: 'This is a comprehensive test event description',
        overview: 'Detailed overview of the event',
        image: 'https://example.com/event.jpg',
        venue: 'Main Conference Hall',
        location: 'New York, NY',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'General Public',
        agenda: [
          'Registration and Welcome',
          'Keynote Speech',
          'Panel Discussion',
          'Networking Session',
        ],
        organizer: 'Tech Conference Inc.',
        tags: ['technology', 'networking', 'conference'],
      };

      const event = new Event(eventData);
      await event.save();

      expect(event._id).toBeDefined();
      expect(event.title).toBe(eventData.title);
      expect(event.slug).toBe('complete-test-event');
      expect(event.description).toBe(eventData.description);
      expect(event.agenda).toEqual(eventData.agenda);
      expect(event.tags).toEqual(eventData.tags);
      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
    });

    it('should set timestamps on creation', async () => {
      const event = new Event({
        title: 'Timestamp Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      const beforeSave = new Date();
      await event.save();
      const afterSave = new Date();

      expect(event.createdAt).toBeDefined();
      expect(event.updatedAt).toBeDefined();
      expect(event.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(event.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const event = new Event({
        title: 'Update Test Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      const originalUpdatedAt = event.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      event.description = 'Updated description';
      await event.save();

      expect(event.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title', async () => {
      const longTitle = 'A'.repeat(1000);
      const event = new Event({
        title: longTitle,
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.title).toBe(longTitle);
    });

    it('should handle empty string trimming', async () => {
      const event = new Event({
        title: '   ',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      // Should fail because after trimming, title is empty
      await expect(event.save()).rejects.toThrow();
    });

    it('should handle midnight time (00:00)', async () => {
      const event = new Event({
        title: 'Midnight Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '00:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.time).toBe('00:00');
    });

    it('should handle end of day time (23:59)', async () => {
      const event = new Event({
        title: 'Late Night Event',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-15',
        time: '23:59',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag1'],
      });

      await event.save();
      expect(event.time).toBe('23:59');
    });
  });
});