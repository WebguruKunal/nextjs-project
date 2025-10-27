/**
 * Comprehensive Unit Tests for lib/mongodb.ts
 * 
 * Tests the MongoDB connection module including:
 * - Connection establishment and caching
 * - Error handling
 * - Environment variable validation
 * - Connection reuse
 * - Promise handling and concurrency
 */

import mongoose from 'mongoose';

describe('MongoDB Connection Module', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalGlobalMongoose: any;
  let connectDB: () => Promise<typeof mongoose>;

  beforeAll(() => {
    // Save original environment and global state
    originalEnv = { ...process.env };
    originalGlobalMongoose = (global as any).mongoose;
  });

  beforeEach(() => {
    // Reset environment and global state before each test
    process.env = { ...originalEnv };
    (global as any).mongoose = undefined;
    
    // Clear module cache to get fresh import
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original state
    process.env = originalEnv;
    (global as any).mongoose = originalGlobalMongoose;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when MONGODB_URI is not defined', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        require('../../lib/mongodb');
      }).toThrow('Please define the MONGODB_URI environment variable inside .env.local');
    });

    it('should throw error when MONGODB_URI is empty string', () => {
      process.env.MONGODB_URI = '';
      
      expect(() => {
        require('../../lib/mongodb');
      }).toThrow('Please define the MONGODB_URI environment variable inside .env.local');
    });

    it('should not throw error when MONGODB_URI is properly defined', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      
      expect(() => {
        require('../../lib/mongodb');
      }).not.toThrow();
    });
  });

  describe('Connection Establishment', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      
      // Mock mongoose.connect
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should establish connection on first call', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      const result = await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/testdb',
        { bufferCommands: false }
      );
      expect(result).toBe(mongoose);
      expect(console.log).toHaveBeenCalledWith('MongoDB connected successfully');
    });

    it('should use correct connection options', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          bufferCommands: false,
        })
      );
    });

    it('should log success message on successful connection', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      expect(console.log).toHaveBeenCalledWith('MongoDB connected successfully');
    });
  });

  describe('Connection Caching', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return cached connection on subsequent calls', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      const firstCall = await connectDB();
      const secondCall = await connectDB();
      const thirdCall = await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(firstCall).toBe(secondCall);
      expect(secondCall).toBe(thirdCall);
    });

    it('should reuse connection promise during concurrent calls', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      // Make multiple concurrent calls
      const promises = [
        connectDB(),
        connectDB(),
        connectDB(),
        connectDB(),
      ];
      
      await Promise.all(promises);
      
      // Should only connect once despite concurrent calls
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it('should cache connection in global namespace', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      const globalCache = (global as any).mongoose;
      expect(globalCache).toBeDefined();
      expect(globalCache.conn).toBe(mongoose);
      expect(globalCache.promise).toBeInstanceOf(Promise);
    });

    it('should initialize global cache if not present', () => {
      expect((global as any).mongoose).toBeUndefined();
      
      connectDB = require('../../lib/mongodb').default;
      
      expect((global as any).mongoose).toBeDefined();
      expect((global as any).mongoose).toEqual({
        conn: null,
        promise: null,
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw error when connection fails', async () => {
      const connectionError = new Error('Connection failed');
      jest.spyOn(mongoose, 'connect').mockRejectedValue(connectionError);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Connection failed');
    });

    it('should reset promise cache on connection failure', async () => {
      const connectionError = new Error('Connection failed');
      jest.spyOn(mongoose, 'connect').mockRejectedValueOnce(connectionError);
      
      connectDB = require('../../lib/mongodb').default;
      
      // First call should fail
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      // Verify promise was reset
      const globalCache = (global as any).mongoose;
      expect(globalCache.promise).toBeNull();
      expect(globalCache.conn).toBeNull();
    });

    it('should allow retry after failed connection', async () => {
      const connectionError = new Error('Connection failed');
      jest.spyOn(mongoose, 'connect')
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce(mongoose);
      
      connectDB = require('../../lib/mongodb').default;
      
      // First call fails
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      // Second call should succeed
      const result = await connectDB();
      expect(result).toBe(mongoose);
      expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      (timeoutError as any).code = 'ETIMEDOUT';
      jest.spyOn(mongoose, 'connect').mockRejectedValue(timeoutError);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      (authError as any).name = 'MongoServerError';
      jest.spyOn(mongoose, 'connect').mockRejectedValue(authError);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Authentication failed');
    });

    it('should handle invalid connection string errors', async () => {
      const invalidUriError = new Error('Invalid connection string');
      jest.spyOn(mongoose, 'connect').mockRejectedValue(invalidUriError);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Invalid connection string');
    });
  });

  describe('Connection Options', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should disable buffer commands for fail-fast behavior', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      const callArgs = (mongoose.connect as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toEqual({
        bufferCommands: false,
      });
    });

    it('should not include deprecated options', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      const callArgs = (mongoose.connect as jest.Mock).mock.calls[0];
      const options = callArgs[1];
      
      // Verify no deprecated options are used
      expect(options).not.toHaveProperty('useNewUrlParser');
      expect(options).not.toHaveProperty('useUnifiedTopology');
      expect(options).not.toHaveProperty('useFindAndModify');
      expect(options).not.toHaveProperty('useCreateIndex');
    });
  });

  describe('Connection URI Handling', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should accept MongoDB connection string with credentials', async () => {
      process.env.MONGODB_URI = 'mongodb://user:pass@localhost:27017/testdb';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://user:pass@localhost:27017/testdb',
        expect.any(Object)
      );
    });

    it('should accept MongoDB Atlas connection string', async () => {
      process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/testdb?retryWrites=true';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb+srv://user:pass@cluster.mongodb.net/testdb?retryWrites=true',
        expect.any(Object)
      );
    });

    it('should accept connection string with multiple hosts', async () => {
      process.env.MONGODB_URI = 'mongodb://host1:27017,host2:27017,host3:27017/testdb?replicaSet=rs0';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        expect.stringContaining('host1:27017,host2:27017,host3:27017'),
        expect.any(Object)
      );
    });
  });

  describe('Type Safety', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      jest.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return mongoose instance type', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      const result = await connectDB();
      
      // Type assertion - would fail at compile time if types are wrong
      expect(result).toBe(mongoose);
      expect(typeof result.connect).toBe('function');
      expect(typeof result.model).toBe('function');
    });

    it('should properly type global mongoose cache', async () => {
      connectDB = require('../../lib/mongodb').default;
      
      await connectDB();
      
      const cache = (global as any).mongoose;
      expect(cache).toHaveProperty('conn');
      expect(cache).toHaveProperty('promise');
    });
  });
});