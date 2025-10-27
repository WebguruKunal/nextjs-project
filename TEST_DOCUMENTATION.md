# Test Documentation

## Overview

This document provides comprehensive documentation for the unit tests covering the deleted database models and MongoDB connection module. These tests were generated to ensure the functionality of:

- MongoDB connection module (`lib/mongodb.ts`)
- Event model (`database/event.model.ts`)
- Booking model (`database/booking.model.ts`)
- Database index module (`database/index.ts`)

## Test Statistics

- **Total Test Files**: 4
- **Total Test Cases**: 92
  - MongoDB Connection Tests: 15 test cases
  - Event Model Tests: 39 test cases
  - Booking Model Tests: 26 test cases
  - Database Index Tests: 12 test cases

## Installation

Before running the tests, install the required dependencies:

```bash
npm install --save-dev jest ts-jest @types/jest mongoose @types/mongoose
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm test:watch
```

### Run Tests with Coverage Report
```bash
npm test:coverage
```

### Run Tests with Verbose Output
```bash
npm test:verbose
```

### Run Specific Test File
```bash
npx jest __tests__/lib/mongodb.test.ts
npx jest __tests__/database/event.model.test.ts
npx jest __tests__/database/booking.model.test.ts
npx jest __tests__/database/index.test.ts
```

## Test Structure

### 1. MongoDB Connection Tests (`__tests__/lib/mongodb.test.ts`)

#### Test Suites:
- **Environment Variable Validation** (2 tests)
  - Validates MONGODB_URI environment variable presence
  - Ensures proper error handling when URI is missing

- **Connection Establishment** (4 tests)
  - Tests new connection creation
  - Validates connection caching
  - Tests connection promise reuse
  - Verifies success logging

- **Error Handling** (3 tests)
  - Tests promise cache reset on failure
  - Validates error propagation
  - Tests authentication error handling

- **Global Cache Management** (3 tests)
  - Tests global cache initialization
  - Validates existing cache usage
  - Tests cache persistence across module requires

- **Connection Options** (2 tests)
  - Validates bufferCommands option
  - Tests correct URI usage from environment

- **Concurrent Connection Attempts** (1 test)
  - Tests multiple concurrent connection handling

#### Key Features Tested:
- Environment variable validation
- Connection caching and reuse
- Error handling and recovery
- Global cache management
- Concurrent connection handling
- Connection options configuration

### 2. Event Model Tests (`__tests__/database/event.model.test.ts`)

#### Test Suites:
- **Schema Definition** (7 tests)
  - Validates all required fields
  - Tests field types
  - Checks required field configuration
  - Validates timestamps
  - Tests slug configuration
  - Validates string field trimming

- **Agenda Validation** (2 tests)
  - Tests array validation
  - Validates minimum item requirement
  - Tests validation messages

- **Tags Validation** (2 tests)
  - Tests array validation
  - Validates minimum tag requirement
  - Tests validation messages

- **Slug Generation Pre-save Hook** (9 tests)
  - Tests slug generation from title
  - Validates special character removal
  - Tests space handling
  - Validates hyphen normalization
  - Tests lowercase conversion
  - Validates whitespace trimming
  - Tests edge cases (empty title, special characters only)

- **Date Normalization Pre-save Hook** (5 tests)
  - Tests ISO format normalization
  - Validates various date formats
  - Tests invalid date handling
  - Validates Date object handling
  - Tests modification tracking

- **Time Validation Pre-save Hook** (8 tests)
  - Validates HH:MM format
  - Tests single-digit hour
  - Validates midnight and end-of-day times
  - Tests invalid time rejection
  - Validates format enforcement

- **Schema Indexes** (1 test)
  - Tests unique index on slug

- **Model Registration** (2 tests)
  - Tests new model creation
  - Validates model cache reuse

- **Edge Cases and Complex Scenarios** (4 tests)
  - Tests simultaneous field modifications
  - Validates unicode character handling
  - Tests leap year dates
  - Validates invalid leap year rejection

#### Key Features Tested:
- Schema structure and field definitions
- Data validation (agenda, tags, email)
- Pre-save hooks (slug generation, date/time normalization)
- Index configuration
- Model caching and hot-reload support
- Edge case handling

### 3. Booking Model Tests (`__tests__/database/booking.model.test.ts`)

#### Test Suites:
- **Schema Definition** (4 tests)
  - Validates required fields
  - Tests ObjectId reference configuration
  - Validates email field configuration
  - Tests timestamps

- **Email Validation** (6 tests)
  - Tests valid email formats
  - Validates email rejection for invalid formats
  - Tests edge case email formats
  - Validates space rejection
  - Tests multiple @ symbol rejection
  - Validates validation messages

- **Pre-save Hook - Event Validation** (8 tests)
  - Tests event existence validation for new bookings
  - Validates event existence check on eventId modification
  - Tests error handling for non-existent events
  - Validates validation skip for unmodified eventId
  - Tests database error handling
  - Validates non-Error exception handling
  - Tests dynamic Event model import
  - Validates eventId modification from null

- **Schema Indexes** (1 test)
  - Tests index on eventId

- **Model Registration** (2 tests)
  - Tests new model creation
  - Validates model cache reuse

- **TypeScript Interface** (1 test)
  - Validates IBooking interface export

- **Edge Cases** (4 tests)
  - Tests concurrent validation requests
  - Validates long email addresses
  - Tests trim and lowercase configuration
  - Validates different ObjectId formats

#### Key Features Tested:
- Schema structure and relationships
- Email validation with RFC 5322 compliance
- Event existence validation via pre-save hook
- Circular dependency handling
- Error handling and edge cases
- Model caching and hot-reload support

### 4. Database Index Tests (`__tests__/database/index.test.ts`)

#### Test Suites:
- **Module Exports** (4 tests)
  - Tests Event model export
  - Tests Booking model export
  - Validates IEvent interface export
  - Validates IBooking interface export

- **Re-export Structure** (1 test)
  - Tests proper re-export of all models and types

- **Module Loading** (2 tests)
  - Tests error-free importing
  - Validates missing dependency handling

- **Type Exports** (2 tests)
  - Tests separate type imports
  - Tests separate model imports

- **Import/Export Consistency** (1 test)
  - Validates model reference maintenance across imports

- **Barrel Export Pattern** (2 tests)
  - Tests destructured imports
  - Validates namespace imports

#### Key Features Tested:
- Barrel export pattern implementation
- Model and type re-exports
- Module loading behavior
- Import/export consistency
- Dependency error handling

## Test Coverage Goals

The Jest configuration includes coverage thresholds:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

## Mocking Strategy

### Mongoose Mocking
All tests use Jest mocks to simulate Mongoose behavior without requiring a real MongoDB connection:

```typescript
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  model: jest.fn(),
  models: {},
  Schema: actualMongoose.Schema,
}));
```

### Environment Variable Mocking
Tests manipulate `process.env` to test different configurations:

```typescript
beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});
```

## Test Patterns Used

### 1. AAA Pattern (Arrange-Act-Assert)
All tests follow the Arrange-Act-Assert pattern for clarity:

```typescript
it('should establish a new connection when cache is empty', async () => {
  // Arrange
  const mockMongooseInstance = { connection: { readyState: 1 } };
  mockMongoose.connect.mockResolvedValueOnce(mockMongooseInstance);
  
  // Act
  connectDB = require('../../lib/mongodb').default;
  const result = await connectDB();
  
  // Assert
  expect(mockMongoose.connect).toHaveBeenCalledWith(
    'mongodb://localhost:27017/test',
    { bufferCommands: false }
  );
  expect(result).toBe(mockMongooseInstance);
});
```

### 2. Test Isolation
Each test is completely isolated with proper setup and teardown:

```typescript
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  // ... additional setup
});

afterEach(() => {
  // ... cleanup
});
```

### 3. Comprehensive Edge Case Testing
Tests cover:
- Happy paths
- Error conditions
- Edge cases (empty strings, null values, boundary conditions)
- Concurrent operations
- Various input formats

## Best Practices Followed

1. **Descriptive Test Names**: Each test clearly describes what it's testing
2. **Single Responsibility**: Each test validates one specific behavior
3. **No Test Interdependence**: Tests can run in any order
4. **Proper Mocking**: External dependencies are properly mocked
5. **Async Handling**: Async operations use async/await properly
6. **Error Testing**: Both success and failure paths are tested
7. **Type Safety**: TypeScript types are properly used throughout

## Continuous Integration

These tests are designed to run in CI/CD pipelines. Add to your CI configuration:

```yaml
# Example GitHub Actions
- name: Run Tests
  run: npm test

- name: Generate Coverage Report
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Tests Fail to Import Modules
Ensure all test dependencies are installed:
```bash
npm install --save-dev jest ts-jest @types/jest mongoose @types/mongoose
```

### Module Resolution Issues
Check that `jest.config.js` has correct module name mapping:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

### TypeScript Compilation Errors
Ensure `tsconfig.json` includes test files and has proper type definitions.

## Future Enhancements

1. **Integration Tests**: Add tests that use a real MongoDB instance (e.g., with Docker)
2. **E2E Tests**: Add end-to-end tests for complete workflows
3. **Performance Tests**: Add tests to measure query performance
4. **Mutation Testing**: Use tools like Stryker to ensure test quality
5. **Snapshot Testing**: Add snapshot tests for data structures

## Contributing

When adding new tests:
1. Follow existing patterns and naming conventions
2. Ensure tests are isolated and independent
3. Add both success and failure test cases
4. Include edge case testing
5. Update this documentation with new test suites

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## License

These tests are part of the nextjs-crash-course project and follow the same license.