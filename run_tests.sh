#!/bin/bash

echo "=== Running Backend Tests ==="
cd clothing-store-backend
python -m unittest discover tests

echo ""
echo "=== Running Frontend Tests ==="
cd ../clothing-store-frontend
npm test -- --no-watch --no-progress --browsers=ChromeHeadless

echo ""
echo "All tests completed!" 