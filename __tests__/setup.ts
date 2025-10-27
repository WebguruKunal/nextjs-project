// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
});

afterAll(() => {
  // Clean up
  delete process.env.MONGODB_URI;
});