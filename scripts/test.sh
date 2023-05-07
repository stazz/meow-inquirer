#!/bin/sh

. 'scripts/preamble.sh'

MI_TEST_MODE="$1"
if [ "${MI_TEST_MODE}" = "run" ] || [ "${MI_TEST_MODE}" = "coverage" ]; then
  if [ "$#" -gt 0 ]; then
    shift
  fi
else
  MI_TEST_MODE='run'
fi

yarn run "test:${MI_TEST_MODE}" "$@"
