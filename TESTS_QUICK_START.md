# Tests Quick Start Guide

## 🚀 Getting Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install --save-dev jest ts-jest @types/jest mongoose @types/mongoose
```

### Step 2: Run Tests
```bash
npm test
```

### Step 3: View Coverage
```bash
npm run test:coverage
```

## 📊 Test Overview

| Test Suite | Test Cases | Coverage |
|------------|-----------|----------|
| MongoDB Connection | 15 | Connection management, caching, error handling |
| Event Model | 39 | Schema validation, hooks, slug generation, date/time normalization |
| Booking Model | 26 | Schema validation, email validation, event existence checks |
| Database Index | 12 | Module exports, barrel pattern |
| **Total** | **92** | **Comprehensive coverage of all deleted files** |

## 🎯 Key Test Scenarios Covered

### MongoDB Connection (`lib/mongodb.ts`)
✅ Environment variable validation  
✅ Connection caching and reuse  
✅ Error handling and recovery  
✅ Concurrent connection handling  
✅ Global cache management  

### Event Model (`database/event.model.ts`)
✅ All 14 schema fields validated  
✅ Automatic slug generation from title  
✅ Date normalization to ISO format  
✅ Time format validation (HH:MM)  
✅ Agenda and tags array validation  
✅ Unicode and special character handling  
✅ Leap year date validation  

### Booking Model (`database/booking.model.ts`)
✅ ObjectId reference to Event model  
✅ RFC 5322 compliant email validation  
✅ Event existence verification via pre-save hook  
✅ Circular dependency handling  
✅ Database error handling  
✅ Edge cases (long emails, concurrent requests)  

### Database Index (`database/index.ts`)
✅ Barrel export pattern  
✅ Model and type re-exports  
✅ Import/export consistency  
✅ Module loading behavior  

## 🔧 Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run with verbose output
npm run test:verbose

# Run specific test file
npx jest __tests__/lib/mongodb.test.ts
npx jest __tests__/database/event.model.test.ts
```

## 📁 Test Files Location