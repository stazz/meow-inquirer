set -e

MI_ROOT_DIR="$(pwd)"

# Always use Alpine-based image
MI_NODE_VERSION="$(cat "${MI_ROOT_DIR}/versions/node")-alpine"

yarn ()
{
  docker run \
    --rm \
    -t \
    --volume "${MI_ROOT_DIR}:${MI_ROOT_DIR}:rw" \
    --entrypoint yarn \
    --workdir "${MI_ROOT_DIR}" \
    --env YARN_CACHE_FOLDER="${MI_ROOT_DIR}/.yarn" \
    --env NODE_PATH="${MI_ROOT_DIR}/node_modules" \
    "node:${MI_NODE_VERSION}" \
    "$@"
}
