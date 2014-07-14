#!/bin/bash

if [[ $1 ]]; then
  echo "Run test test_$1.js..."
  node "test/test_$1.js"
else
  for test in `find test -name test_*.js`; do
    echo "Run node $test..."
    node $test
  done
fi
