/**
 * Comprehensive Unit Tests for database/booking.model.ts
 * 
 * Tests the Booking Mongoose model including:
 * - Schema validation
 * - Email validation
 * - Event reference validation (pre-save hook)
 * - Field requirements and constraints
 * - Error handling and edge cases
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('Booking Model', () => {
  let mongoServer: MongoMemoryServer;
  let Booking: any;
  let Event: any;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    // Import models after connection
    const bookingModule = await import('../../database/booking.model');
    const eventModule = await import('../../database/event.model');
    Booking = bookingModule.default;
    Event = eventModule.default;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all documents before each test
    await Booking.deleteMany({});
    await Event.deleteMany({});
  });

  describe('Schema Definition', () => {
    it('should have all required fields defined', () => {
      const schema = Booking.schema;
      const paths = schema.paths;

      expect(paths.eventId).toBeDefined();
      expect(paths.email).toBeDefined();
    });

    it('should have timestamps enabled', () => {
      const schema = Booking.schema;
      expect(schema.options.timestamps).toBe(true);
      expect(schema.paths.createdAt).toBeDefined();
      expect(schema.paths.updatedAt).toBeDefined();
    });

    it('should have index on eventId', () => {
      const indexes = Booking.schema.indexes();
      const eventIdIndex = indexes.find((idx: any) => idx[0].eventId === 1);
      
      expect(eventIdIndex).toBeDefined();
    });

    it('should reference Event model', () => {
      const schema = Booking.schema;
      const eventIdPath = schema.paths.eventId;
      
      expect(eventIdPath.options.ref).toBe('Event');
    });
  });

  describe('Required Field Validation', () => {
    it('should require eventId field', async () => {
      const booking = new Booking({
        email: 'test@example.com',
      });

      await expect(booking.save()).rejects.toThrow(/Event ID is required/);
    });

    it('should require email field', async () => {
      const event = await Event.create({
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

      const booking = new Booking({
        eventId: event._id,
      });

      await expect(booking.save()).rejects.toThrow(/Email is required/);
    });
  });

  describe('Email Validation', () => {
    let testEvent: any;

    beforeEach(async () => {
      testEvent = await Event.create({
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
    });

    it('should accept valid email address', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user@example.com',
      });

      await booking.save();
      expect(booking.email).toBe('user@example.com');
    });

    it('should reject email without @ symbol', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'invalid-email',
      });

      await expect(booking.save()).rejects.toThrow(/Please provide a valid email address/);
    });

    it('should reject email without domain', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user@',
      });

      await expect(booking.save()).rejects.toThrow(/Please provide a valid email address/);
    });

    it('should reject email without local part', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: '@example.com',
      });

      await expect(booking.save()).rejects.toThrow(/Please provide a valid email address/);
    });

    it('should reject email without TLD', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user@domain',
      });

      await expect(booking.save()).rejects.toThrow(/Please provide a valid email address/);
    });

    it('should reject email with spaces', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user @example.com',
      });

      await expect(booking.save()).rejects.toThrow(/Please provide a valid email address/);
    });

    it('should accept email with plus sign', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user+tag@example.com',
      });

      await booking.save();
      expect(booking.email).toBe('user+tag@example.com');
    });

    it('should accept email with subdomain', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user@mail.example.com',
      });

      await booking.save();
      expect(booking.email).toBe('user@mail.example.com');
    });

    it('should accept email with numbers', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'user123@example456.com',
      });

      await booking.save();
      expect(booking.email).toBe('user123@example456.com');
    });

    it('should accept email with hyphens', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'first-last@my-domain.com',
      });

      await booking.save();
      expect(booking.email).toBe('first-last@my-domain.com');
    });

    it('should accept email with underscores', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'first_last@example.com',
      });

      await booking.save();
      expect(booking.email).toBe('first_last@example.com');
    });

    it('should convert email to lowercase', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: 'USER@EXAMPLE.COM',
      });

      await booking.save();
      expect(booking.email).toBe('user@example.com');
    });

    it('should trim whitespace from email', async () => {
      const booking = new Booking({
        eventId: testEvent._id,
        email: '  user@example.com  ',
      });

      await booking.save();
      expect(booking.email).toBe('user@example.com');
    });
  });

  describe('Event Reference Validation (Pre-save Hook)', () => {
    it('should allow booking for existing event', async () => {
      const event = await Event.create({
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

      const booking = new Booking({
        eventId: event._id,
        email: 'user@example.com',
      });

      await expect(booking.save()).resolves.toBeDefined();
    });

    it('should reject booking for non-existent event', async () => {
      const fakeEventId = new mongoose.Types.ObjectId();
      
      const booking = new Booking({
        eventId: fakeEventId,
        email: 'user@example.com',
      });

      await expect(booking.save()).rejects.toThrow(/Event validation failed/);
    });

    it('should validate eventId only on new documents', async () => {
      const event = await Event.create({
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

      const booking = new Booking({
        eventId: event._id,
        email: 'user@example.com',
      });

      await booking.save();

      // Modify email (not eventId)
      booking.email = 'newemail@example.com';
      await expect(booking.save()).resolves.toBeDefined();
    });

    it('should validate eventId when modified', async () => {
      const event1 = await Event.create({
        title: 'Test Event 1',
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

      const booking = new Booking({
        eventId: event1._id,
        email: 'user@example.com',
      });

      await booking.save();

      // Try to change to non-existent event
      const fakeEventId = new mongoose.Types.ObjectId();
      booking.eventId = fakeEventId;

      await expect(booking.save()).rejects.toThrow(/Event validation failed/);
    });

    it('should allow changing to another valid event', async () => {
      const event1 = await Event.create({
        title: 'Test Event 1',
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

      const event2 = await Event.create({
        title: 'Test Event 2',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-16',
        time: '19:00',
        mode: 'Online',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag2'],
      });

      const booking = new Booking({
        eventId: event1._id,
        email: 'user@example.com',
      });

      await booking.save();

      booking.eventId = event2._id;
      await expect(booking.save()).resolves.toBeDefined();
      expect(booking.eventId.toString()).toBe(event2._id.toString());
    });
  });

  describe('Full Document Creation', () => {
    it('should successfully create booking with valid data', async () => {
      const event = await Event.create({
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

      const booking = new Booking({
        eventId: event._id,
        email: 'test@example.com',
      });

      await booking.save();

      expect(booking._id).toBeDefined();
      expect(booking.eventId.toString()).toBe(event._id.toString());
      expect(booking.email).toBe('test@example.com');
      expect(booking.createdAt).toBeDefined();
      expect(booking.updatedAt).toBeDefined();
    });

    it('should set timestamps on creation', async () => {
      const event = await Event.create({
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

      const beforeSave = new Date();
      
      const booking = new Booking({
        eventId: event._id,
        email: 'test@example.com',
      });
      
      await booking.save();
      const afterSave = new Date();

      expect(booking.createdAt).toBeDefined();
      expect(booking.updatedAt).toBeDefined();
      expect(booking.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave.getTime());
      expect(booking.createdAt.getTime()).toBeLessThanOrEqual(afterSave.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const event = await Event.create({
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

      const booking = new Booking({
        eventId: event._id,
        email: 'test@example.com',
      });

      await booking.save();
      const originalUpdatedAt = booking.updatedAt;

      // Wait to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      booking.email = 'updated@example.com';
      await booking.save();

      expect(booking.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Edge Cases', () => {
    let testEvent: any;

    beforeEach(async () => {
      testEvent = await Event.create({
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
    });

    it('should handle very long email addresses', async () => {
      const longEmail = `${'a'.repeat(64)}@${'b'.repeat(63)}.com`;
      
      const booking = new Booking({
        eventId: testEvent._id,
        email: longEmail,
      });

      await booking.save();
      expect(booking.email).toBe(longEmail);
    });

    it('should allow multiple bookings for same event', async () => {
      const booking1 = new Booking({
        eventId: testEvent._id,
        email: 'user1@example.com',
      });

      const booking2 = new Booking({
        eventId: testEvent._id,
        email: 'user2@example.com',
      });

      await booking1.save();
      await booking2.save();

      const bookings = await Booking.find({ eventId: testEvent._id });
      expect(bookings).toHaveLength(2);
    });

    it('should allow same email for different events', async () => {
      const event2 = await Event.create({
        title: 'Test Event 2',
        description: 'Test description',
        overview: 'Test overview',
        image: 'test.jpg',
        venue: 'Test Venue',
        location: 'Test Location',
        date: '2024-12-16',
        time: '19:00',
        mode: 'Online',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Test Organizer',
        tags: ['tag2'],
      });

      const booking1 = new Booking({
        eventId: testEvent._id,
        email: 'user@example.com',
      });

      const booking2 = new Booking({
        eventId: event2._id,
        email: 'user@example.com',
      });

      await booking1.save();
      await booking2.save();

      const bookings = await Booking.find({ email: 'user@example.com' });
      expect(bookings).toHaveLength(2);
    });

    it('should handle invalid ObjectId format', async () => {
      const booking = new Booking({
        eventId: 'invalid-object-id',
        email: 'user@example.com',
      });

      await expect(booking.save()).rejects.toThrow();
    });
  });

  describe('Query Operations', () => {
    let event1: any;
    let event2: any;

    beforeEach(async () => {
      event1 = await Event.create({
        title: 'Event 1',
        description: 'Description 1',
        overview: 'Overview 1',
        image: 'test1.jpg',
        venue: 'Venue 1',
        location: 'Location 1',
        date: '2024-12-15',
        time: '18:00',
        mode: 'Hybrid',
        audience: 'Everyone',
        agenda: ['Item 1'],
        organizer: 'Organizer 1',
        tags: ['tag1'],
      });

      event2 = await Event.create({
        title: 'Event 2',
        description: 'Description 2',
        overview: 'Overview 2',
        image: 'test2.jpg',
        venue: 'Venue 2',
        location: 'Location 2',
        date: '2024-12-16',
        time: '19:00',
        mode: 'Online',
        audience: 'Members',
        agenda: ['Item 2'],
        organizer: 'Organizer 2',
        tags: ['tag2'],
      });

      await Booking.create([
        { eventId: event1._id, email: 'user1@example.com' },
        { eventId: event1._id, email: 'user2@example.com' },
        { eventId: event2._id, email: 'user1@example.com' },
      ]);
    });

    it('should find bookings by eventId', async () => {
      const bookings = await Booking.find({ eventId: event1._id });
      expect(bookings).toHaveLength(2);
    });

    it('should find bookings by email', async () => {
      const bookings = await Booking.find({ email: 'user1@example.com' });
      expect(bookings).toHaveLength(2);
    });

    it('should populate event data', async () => {
      const booking = await Booking.findOne({ email: 'user1@example.com' }).populate('eventId');
      expect(booking.eventId.title).toBeDefined();
    });
  });
});