import mongoose from 'mongoose';

// Store original env
const originalEnv = process.env.MONGODB_URI;

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('MongoDB Connection', () => {
  let connectDB: any;
  let mockConnect: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
    
    // Clear global cache
    if (global.mongoose) {
      global.mongoose = undefined;
    }
    
    mockConnect = mongoose.connect as jest.Mock;
    
    // Set test environment variable
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
  });

  afterEach(() => {
    process.env.MONGODB_URI = originalEnv;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error if MONGODB_URI is not defined', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        jest.isolateModules(() => {
          require('../../lib/mongodb');
        });
      }).toThrow('Please define the MONGODB_URI environment variable inside .env.local');
    });

    it('should not throw if MONGODB_URI is defined', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
      
      expect(() => {
        jest.isolateModules(() => {
          require('../../lib/mongodb');
        });
      }).not.toThrow();
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    });

    it('should establish new connection on first call', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const result = await connectDB();
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/test-db',
        { bufferCommands: false }
      );
      expect(result).toBe(mockMongooseInstance);
    });

    it('should return cached connection on subsequent calls', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const result1 = await connectDB();
      const result2 = await connectDB();
      const result3 = await connectDB();
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockMongooseInstance);
      expect(result2).toBe(mockMongooseInstance);
      expect(result3).toBe(mockMongooseInstance);
    });

    it('should use cached promise if connection in progress', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      let resolveConnect: any;
      const connectPromise = new Promise((resolve) => {
        resolveConnect = resolve;
      });
      mockConnect.mockReturnValue(connectPromise);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const promise1 = connectDB();
      const promise2 = connectDB();
      
      resolveConnect(mockMongooseInstance);
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result1).toBe(mockMongooseInstance);
      expect(result2).toBe(mockMongooseInstance);
    });

    it('should disable buffer commands for fail-fast behavior', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await connectDB();
      
      expect(mockConnect).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ bufferCommands: false })
      );
    });

    it('should log success message on connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await connectDB();
      
      expect(consoleSpy).toHaveBeenCalledWith('MongoDB connected successfully');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    });

    it('should reset promise cache on connection error', async () => {
      const error = new Error('Connection failed');
      mockConnect
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ connection: 'mock' });
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      const result = await connectDB();
      expect(mockConnect).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ connection: 'mock' });
    });

    it('should propagate connection errors', async () => {
      const error = new Error('Network timeout');
      mockConnect.mockRejectedValue(error);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await expect(connectDB()).rejects.toThrow('Network timeout');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Authentication failed');
      mockConnect.mockRejectedValue(error);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await expect(connectDB()).rejects.toThrow('Authentication failed');
    });

    it('should allow retry after error', async () => {
      const error = new Error('Temporary failure');
      const mockMongooseInstance = { connection: 'mock' };
      
      mockConnect
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await expect(connectDB()).rejects.toThrow('Temporary failure');
      await expect(connectDB()).rejects.toThrow('Temporary failure');
      
      const result = await connectDB();
      expect(result).toBe(mockMongooseInstance);
      expect(mockConnect).toHaveBeenCalledTimes(3);
    });
  });

  describe('Global Cache Management', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    });

    it('should initialize global cache if not exists', () => {
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      expect(global.mongoose).toBeDefined();
      expect(global.mongoose?.conn).toBeNull();
      expect(global.mongoose?.promise).toBeNull();
    });

    it('should use existing global cache', async () => {
      const existingCache = {
        conn: { connection: 'existing' } as any,
        promise: null,
      };
      global.mongoose = existingCache;
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const result = await connectDB();
      
      expect(mockConnect).not.toHaveBeenCalled();
      expect(result).toBe(existingCache.conn);
    });

    it('should persist connection across module reloads', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await connectDB();
      
      const cachedConn = global.mongoose?.conn;
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const result = await connectDB();
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(result).toBe(cachedConn);
    });
  });

  describe('Connection Options', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    });

    it('should pass correct connection URI', async () => {
      process.env.MONGODB_URI = 'mongodb://custom-host:27017/custom-db';
      mockConnect.mockResolvedValue({ connection: 'mock' });
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await connectDB();
      
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://custom-host:27017/custom-db',
        expect.any(Object)
      );
    });

    it('should configure bufferCommands option', async () => {
      mockConnect.mockResolvedValue({ connection: 'mock' });
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      await connectDB();
      
      const callArgs = mockConnect.mock.calls[0];
      expect(callArgs[1]).toEqual({ bufferCommands: false });
    });
  });

  describe('Concurrent Connection Attempts', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
    });

    it('should handle multiple simultaneous connection attempts', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      let resolveConnect: any;
      const connectPromise = new Promise((resolve) => {
        resolveConnect = () => resolve(mockMongooseInstance);
      });
      mockConnect.mockReturnValue(connectPromise);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const promises = [
        connectDB(),
        connectDB(),
        connectDB(),
        connectDB(),
        connectDB(),
      ];
      
      resolveConnect();
      
      const results = await Promise.all(promises);
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      results.forEach(result => {
        expect(result).toBe(mockMongooseInstance);
      });
    });

    it('should handle race condition with cached connection', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const firstCall = await connectDB();
      
      const subsequentCalls = await Promise.all([
        connectDB(),
        connectDB(),
        connectDB(),
      ]);
      
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(firstCall).toBe(mockMongooseInstance);
      subsequentCalls.forEach(result => {
        expect(result).toBe(mockMongooseInstance);
      });
    });
  });

  describe('TypeScript Type Definitions', () => {
    it('should define MongooseCache interface correctly', () => {
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      expect(global.mongoose).toMatchObject({
        conn: expect.anything(),
        promise: expect.anything(),
      });
    });

    it('should return Promise<typeof mongoose>', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      mockConnect.mockResolvedValue(mockMongooseInstance);
      
      jest.isolateModules(() => {
        connectDB = require('../../lib/mongodb').default;
      });
      
      const result = connectDB();
      expect(result).toBeInstanceOf(Promise);
      
      const resolved = await result;
      expect(resolved).toBeDefined();
    });
  });
});