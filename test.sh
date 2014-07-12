#!/bin/bash

for test in `find test -name test_*.js`; do
  node $test
done