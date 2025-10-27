import mongoose from 'mongoose';

// Mock mongoose before importing the module
jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('MongoDB Connection Module', () => {
  let connectDB: () => Promise<typeof mongoose>;
  const originalEnv = process.env;
  const mockMongoose = mongoose as jest.Mocked<typeof mongoose>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Clear the global mongoose cache
    if (global.mongoose) {
      delete global.mongoose;
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when MONGODB_URI is not defined', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        require('../../lib/mongodb');
      }).toThrow('Please define the MONGODB_URI environment variable inside .env.local');
    });

    it('should not throw error when MONGODB_URI is defined', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
      
      expect(() => {
        require('../../lib/mongodb');
      }).not.toThrow();
    });
  });

  describe('Connection Establishment', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    it('should establish a new connection when cache is empty', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      const result = await connectDB();
      
      expect(mockMongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test',
        { bufferCommands: false }
      );
      expect(result).toBe(mockMongooseInstance);
    });

    it('should return cached connection if already established', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      
      const firstCall = await connectDB();
      const secondCall = await connectDB();
      
      expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
      expect(firstCall).toBe(secondCall);
    });

    it('should reuse connection promise if connection is in progress', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      let resolveConnect: (value: any) => void;
      const connectPromise = new Promise((resolve) => {
        resolveConnect = resolve;
      });
      
      mockMongoose.connect.mockReturnValueOnce(connectPromise as any);
      
      connectDB = require('../../lib/mongodb').default;
      
      const firstCallPromise = connectDB();
      const secondCallPromise = connectDB();
      
      resolveConnect!(mockMongooseInstance);
      
      const [firstResult, secondResult] = await Promise.all([
        firstCallPromise,
        secondCallPromise,
      ]);
      
      expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(secondResult);
    });

    it('should log success message on successful connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(consoleSpy).toHaveBeenCalledWith('MongoDB connected successfully');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    it('should reset promise cache on connection failure', async () => {
      const error = new Error('Connection failed');
      mockMongoose.connect.mockRejectedValueOnce(error);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      // Verify that promise is reset by attempting a second connection
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      const result = await connectDB();
      expect(result).toBe(mockMongooseInstance);
      expect(mockMongoose.connect).toHaveBeenCalledTimes(2);
    });

    it('should propagate connection errors', async () => {
      const error = new Error('Network timeout');
      mockMongoose.connect.mockRejectedValueOnce(error);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Network timeout');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockMongoose.connect.mockRejectedValueOnce(authError);
      
      connectDB = require('../../lib/mongodb').default;
      
      await expect(connectDB()).rejects.toThrow('Authentication failed');
    });
  });

  describe('Global Cache Management', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    it('should initialize global mongoose cache if not present', () => {
      delete global.mongoose;
      
      require('../../lib/mongodb');
      
      expect(global.mongoose).toBeDefined();
      expect(global.mongoose).toHaveProperty('conn');
      expect(global.mongoose).toHaveProperty('promise');
    });

    it('should use existing global mongoose cache if present', () => {
      const mockCache = { conn: null, promise: null };
      global.mongoose = mockCache;
      
      require('../../lib/mongodb');
      
      expect(global.mongoose).toBe(mockCache);
    });

    it('should persist cache across multiple module requires', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      const firstModule = require('../../lib/mongodb');
      await firstModule.default();
      
      // Require the module again
      jest.resetModules();
      const secondModule = require('../../lib/mongodb');
      const result = await secondModule.default();
      
      // Should use cached connection from global
      expect(result).toBe(mockMongooseInstance);
    });
  });

  describe('Connection Options', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    it('should set bufferCommands to false', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(mockMongoose.connect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ bufferCommands: false })
      );
    });

    it('should use correct MongoDB URI from environment', async () => {
      const testUri = 'mongodb://test-host:27017/test-db';
      process.env.MONGODB_URI = testUri;
      
      jest.resetModules();
      
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      await connectDB();
      
      expect(mockMongoose.connect).toHaveBeenCalledWith(
        testUri,
        expect.any(Object)
      );
    });
  });

  describe('Concurrent Connection Attempts', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    });

    it('should handle multiple concurrent connection attempts gracefully', async () => {
      const mockMongooseInstance = { connection: { readyState: 1 } } as any;
      mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('../../lib/mongodb').default;
      
      const results = await Promise.all([
        connectDB(),
        connectDB(),
        connectDB(),
        connectDB(),
        connectDB(),
      ]);
      
      expect(mockMongoose.connect).toHaveBeenCalledTimes(1);
      results.forEach((result) => {
        expect(result).toBe(mockMongooseInstance);
      });
    });
  });
});