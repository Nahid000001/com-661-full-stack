# Testing Guide for Clothing Store Application

This document provides instructions for running the existing test suite and guidelines for adding new tests.

## Running Tests

### On Linux/Mac:

1. Make the test script executable (if not already):

   ```
   chmod +x run_tests.sh
   ```

2. Run the tests:
   ```
   ./run_tests.sh
   ```

### On Windows:

Run the PowerShell script:

```
.\run_tests.ps1
```

## Running Backend Tests Only

```
cd clothing-store-backend
python -m unittest discover tests
```

## Running Frontend Tests Only

```
cd clothing-store-frontend
npm test
```

For headless testing (CI/CD environments):

```
cd clothing-store-frontend
npm test -- --no-watch --no-progress --browsers=ChromeHeadless
```

## Adding New Tests

### Backend Tests

1. Create new test files in the `clothing-store-backend/tests/` directory
2. Name your test files with the prefix `test_` followed by a descriptive name
3. Extend the existing `APITestCase` class or create your own
4. Use the mock database setup provided in the existing test files
5. Follow the existing pattern of creating helper methods for test setup

Example:

```python
import unittest
from app import create_app
from app import mongo
from mongomock import MongoClient

class MyNewTestCase(unittest.TestCase):
    # Setup and teardown methods
    # Test methods
```

### Frontend Tests

#### Service Tests

1. Create or modify spec files in the `src/app/services/` directory
2. Use `HttpClientTestingModule` for mocking HTTP requests
3. Use the Jasmine spy functions to mock service dependencies

Example:

```typescript
import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { MyService } from "./my.service";

describe("MyService", () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MyService],
    });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  // Test methods
});
```

#### Component Tests

1. Create or modify spec files in the corresponding component directory
2. Mock the services that the component depends on
3. Test component lifecycle methods, user interactions, and rendering

Example:

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of } from "rxjs";
import { MyComponent } from "./my.component";
import { MyService } from "../../services/my.service";

describe("MyComponent", () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;
  let myServiceSpy: jasmine.SpyObj<MyService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj("MyService", ["getItems"]);

    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [{ provide: MyService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    myServiceSpy = TestBed.inject(MyService) as jasmine.SpyObj<MyService>;
  });

  // Test methods
});
```

## Test Coverage

To generate test coverage reports:

### Backend

```
cd clothing-store-backend
coverage run -m unittest discover tests
coverage report
# For HTML report
coverage html
```

### Frontend

```
cd clothing-store-frontend
npm test -- --no-watch --no-progress --code-coverage
```

Coverage reports will be generated in the `coverage/` directory.

## Continuous Integration

The test suite is automatically run in the CI pipeline whenever code is pushed to the repository. Ensure that all tests pass locally before pushing your changes.
