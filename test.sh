#!/bin/bash

for test in `find test -name test_*.js`; do
  echo "Run node $test..."
  node $test
done