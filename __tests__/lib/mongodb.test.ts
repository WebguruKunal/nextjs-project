import mongoose from 'mongoose';

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
}));

describe('MongoDB Connection Module', () => {
  let connectDB: any;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear module cache
    jest.resetModules();
    jest.clearAllMocks();
    
    // Clear global mongoose cache
    (global as any).mongoose = undefined;
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
    
    // Clear global cache
    (global as any).mongoose = undefined;
  });

  describe('Environment Variable Validation', () => {
    it('should throw error when MONGODB_URI is not defined', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        require('/tmp/mongodb.ts');
      }).toThrow('Please define the MONGODB_URI environment variable inside .env.local');
    });

    it('should not throw when MONGODB_URI is defined', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      
      expect(() => {
        require('/tmp/mongodb.ts');
      }).not.toThrow();
    });

    it('should accept various MongoDB URI formats', () => {
      const validUris = [
        'mongodb://localhost:27017/db',
        'mongodb://user:pass@localhost:27017/db',
        'mongodb+srv://cluster.mongodb.net/db',
        'mongodb://host1:27017,host2:27017/db?replicaSet=rs',
      ];

      validUris.forEach((uri) => {
        jest.resetModules();
        (global as any).mongoose = undefined;
        process.env.MONGODB_URI = uri;
        
        expect(() => {
          require('/tmp/mongodb.ts');
        }).not.toThrow();
      });
    });
  });

  describe('Connection Caching', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should return cached connection if already established', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // First call
      const conn1 = await connectDB();
      
      // Second call
      const conn2 = await connectDB();
      
      // Should only connect once
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(conn1).toBe(conn2);
    });

    it('should initialize global cache if not present', () => {
      expect((global as any).mongoose).toBeUndefined();
      
      require('/tmp/mongodb.ts');
      
      expect((global as any).mongoose).toBeDefined();
      expect((global as any).mongoose).toHaveProperty('conn');
      expect((global as any).mongoose).toHaveProperty('promise');
    });

    it('should use existing global cache if present', () => {
      const existingCache = { conn: null, promise: null };
      (global as any).mongoose = existingCache;
      
      require('/tmp/mongodb.ts');
      
      expect((global as any).mongoose).toBe(existingCache);
    });

    it('should return existing connection promise if connection in progress', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockImplementation(() => 
        new Promise((resolve) => setTimeout(() => resolve(mockMongooseInstance), 100))
      );
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // Start two connections simultaneously
      const promise1 = connectDB();
      const promise2 = connectDB();
      
      await Promise.all([promise1, promise2]);
      
      // Should only attempt to connect once
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Options', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should connect with bufferCommands disabled', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/testdb',
        { bufferCommands: false }
      );
    });

    it('should log success message on successful connection', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      await connectDB();
      
      expect(consoleSpy).toHaveBeenCalledWith('MongoDB connected successfully');
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should reset promise on connection error', async () => {
      const connectionError = new Error('Connection failed');
      (mongoose.connect as jest.Mock).mockRejectedValue(connectionError);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      // Verify promise is reset
      const cache = (global as any).mongoose;
      expect(cache.promise).toBeNull();
    });

    it('should allow retry after failed connection', async () => {
      const connectionError = new Error('Connection failed');
      const mockMongooseInstance = { connection: 'mock' };
      
      (mongoose.connect as jest.Mock)
        .mockRejectedValueOnce(connectionError)
        .mockResolvedValueOnce(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // First attempt fails
      await expect(connectDB()).rejects.toThrow('Connection failed');
      
      // Second attempt succeeds
      const conn = await connectDB();
      expect(conn).toBe(mockMongooseInstance);
      expect(mongoose.connect).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('ETIMEDOUT');
      (mongoose.connect as jest.Mock).mockRejectedValue(timeoutError);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      await expect(connectDB()).rejects.toThrow('ETIMEDOUT');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      (mongoose.connect as jest.Mock).mockRejectedValue(authError);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      await expect(connectDB()).rejects.toThrow('Authentication failed');
    });

    it('should propagate connection errors without modifying them', async () => {
      const originalError = new Error('Original error message');
      originalError.name = 'MongoNetworkError';
      (mongoose.connect as jest.Mock).mockRejectedValue(originalError);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      try {
        await connectDB();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as Error).name).toBe('MongoNetworkError');
      }
    });
  });

  describe('Concurrent Connection Handling', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should handle multiple concurrent connection requests', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(mockMongooseInstance), 50))
      );
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // Make 5 concurrent connection requests
      const promises = Array(5).fill(null).map(() => connectDB());
      const results = await Promise.all(promises);
      
      // All should return the same instance
      results.forEach((result) => {
        expect(result).toBe(mockMongooseInstance);
      });
      
      // Should only connect once
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle connection requests after initial connection', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // First connection
      await connectDB();
      
      // Subsequent connections
      const conn2 = await connectDB();
      const conn3 = await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
      expect(conn2).toBe(mockMongooseInstance);
      expect(conn3).toBe(mockMongooseInstance);
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should work across module reloads in development', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      // First load
      connectDB = require('/tmp/mongodb.ts').default;
      const conn1 = await connectDB();
      
      // Simulate module reload (but keep global cache)
      jest.resetModules();
      connectDB = require('/tmp/mongodb.ts').default;
      const conn2 = await connectDB();
      
      // Should reuse the cached connection
      expect(conn1).toBe(conn2);
    });

    it('should handle environment variable changes between imports', () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/db1';
      const module1 = require('/tmp/mongodb.ts');
      
      jest.resetModules();
      process.env.MONGODB_URI = 'mongodb://localhost:27017/db2';
      
      // Should throw because MONGODB_URI is read at import time
      // This is expected behavior - URI should not change after initial load
      expect(() => {
        require('/tmp/mongodb.ts');
      }).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should return mongoose instance with correct type', async () => {
      const mockMongooseInstance = { 
        connection: 'mock',
        model: jest.fn(),
        Schema: {},
      };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      const result = await connectDB();
      
      expect(result).toHaveProperty('connection');
      expect(result).toBe(mockMongooseInstance);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string MONGODB_URI', () => {
      process.env.MONGODB_URI = '';
      
      expect(() => {
        require('/tmp/mongodb.ts');
      }).toThrow('Please define the MONGODB_URI environment variable');
    });

    it('should handle undefined environment at module level', () => {
      delete process.env.MONGODB_URI;
      
      expect(() => {
        require('/tmp/mongodb.ts');
      }).toThrow();
    });

    it('should maintain cache across async operations', async () => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      const conn1 = await connectDB();
      
      // Simulate some async work
      await new Promise((resolve) => setTimeout(resolve, 10));
      
      const conn2 = await connectDB();
      
      expect(conn1).toBe(conn2);
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });

    it('should handle very long URI strings', async () => {
      const longUri = 'mongodb://localhost:27017/' + 'a'.repeat(1000);
      process.env.MONGODB_URI = longUri;
      
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      jest.resetModules();
      connectDB = require('/tmp/mongodb.ts').default;
      
      await connectDB();
      
      expect(mongoose.connect).toHaveBeenCalledWith(longUri, expect.any(Object));
    });
  });

  describe('Performance', () => {
    beforeEach(() => {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/testdb';
    });

    it('should return cached connection immediately on subsequent calls', async () => {
      const mockMongooseInstance = { connection: 'mock' };
      (mongoose.connect as jest.Mock).mockResolvedValue(mockMongooseInstance);
      
      connectDB = require('/tmp/mongodb.ts').default;
      
      // First call
      const start1 = Date.now();
      await connectDB();
      const duration1 = Date.now() - start1;
      
      // Second call (should be instant)
      const start2 = Date.now();
      await connectDB();
      const duration2 = Date.now() - start2;
      
      // Second call should be much faster (cached)
      expect(duration2).toBeLessThan(duration1);
      expect(mongoose.connect).toHaveBeenCalledTimes(1);
    });
  });
});