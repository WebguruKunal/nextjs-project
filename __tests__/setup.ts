// Mock environment variables
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';

// Increase timeout for async operations
jest.setTimeout(10000);