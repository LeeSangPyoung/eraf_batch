#!/bin/bash

set -e

# Get tag from input
TAG=$1
IMAGE_NAME="batch-worker"

# check if tag is provided
if [ -z "${TAG}" ]; then
    echo "Error: Tag is not provided"
    exit 1
fi

# check if .env file exists
if [ ! -f ".env" ]; then
    echo "Error: .env file not found"
    exit 1
fi

IMAGE_TAG="${IMAGE_NAME}:${TAG}"

# build docker image
docker build -t ${IMAGE_TAG} .

# save tag to image_tag.txt
echo "${IMAGE_TAG}" > image_tag.txt

# save image to tar file
docker save -o batch-worker.tar ${IMAGE_TAG}

# save tar file to zip file, along with start_worker.sh, stop_worker.sh, image_tag.txt and .env
zip -r batch-worker.zip batch-worker.tar start_worker.sh stop_worker.sh image_tag.txt .env

# clean up
rm -f batch-worker.tar
rm -f image_tag.txt

echo "Application zipped successfully"