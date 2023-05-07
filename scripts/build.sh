#!/bin/sh

. 'scripts/preamble.sh'

MI_BUILD_MODE="$1"
if [ "${MI_BUILD_MODE}" = "run" ] || [ "${MI_BUILD_MODE}" = "ci" ]; then
  if [ "$#" -gt 0 ]; then
    shift
  fi
else
  MI_BUILD_MODE='run'
fi

yarn run "build:${MI_BUILD_MODE}"