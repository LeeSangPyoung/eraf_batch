#!/bin/bash

set -e

# Function to extract image name and tag from tar file
extract_image_info() {
    local tar_file="$1"

    if [ ! -f "$tar_file" ]; then
        echo "Error: Tar file $tar_file not found"
        return 1
    fi

    # Extract repositories file and parse it
    local temp_dir=$(mktemp -d)
    tar -xf "$tar_file" -C "$temp_dir" repositories 2>/dev/null || {
        echo "Error: Could not extract repositories file from $tar_file"
        rm -rf "$temp_dir"
        return 1
    }

    # Parse JSON to get image name and tag
    local image_info=$(python3 -c "
import json, sys
try:
    with open('$temp_dir/repositories', 'r') as f:
        data = json.load(f)
    for name, tags in data.items():
        for tag in tags.keys():
            print(f'{name}:{tag}')
            break
        break
except Exception as e:
    sys.exit(1)
" 2>/dev/null)

    rm -rf "$temp_dir"

    if [ -z "$image_info" ]; then
        echo "Error: Could not parse image information from $tar_file"
        return 1
    fi

    echo "$image_info"
}

# Function to check if Docker image exists
check_docker_image_exists() {
    local image_name="$1"

    if ! command -v docker &> /dev/null; then
        echo "Error: docker command not found"
        return 1
    fi

    docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${image_name}$"
}

# Function to load Docker image from tar file
load_docker_image() {
    local tar_file="$1"

    echo "Loading Docker image from $tar_file..."
    if docker load < "$tar_file"; then
        echo "Successfully loaded Docker image from $tar_file"
        return 0
    else
        echo "Error: Failed to load Docker image from $tar_file"
        return 1
    fi
}

# check if image tag file exists
if [ ! -f "image_tag.txt" ]; then
    echo "Error: Image tag file image_tag.txt not found"
    exit 1
fi

# Docker image management
TAR_FILE="batch-worker.tar"

if [ -f "$TAR_FILE" ]; then
    echo "Found Docker image tar file: $TAR_FILE"

    # Extract image name and tag from tar file
    IMAGE_NAME_TAG=$(extract_image_info "$TAR_FILE")
    # check image name tag is same as image tag file
    if [ "$IMAGE_NAME_TAG" != "$(cat image_tag.txt)" ]; then
        echo "Error: Image name tag $IMAGE_NAME_TAG is not same as image tag file $(cat image_tag.txt)"
        exit 1
    fi

    if [ $? -eq 0 ]; then
        echo "Extracted image information: $IMAGE_NAME_TAG"

        # Check if the image exists locally
        if check_docker_image_exists "$IMAGE_NAME_TAG"; then
            echo "Docker image $IMAGE_NAME_TAG already exists locally"
        else
            echo "Docker image $IMAGE_NAME_TAG not found locally, loading from tar file..."
            if ! load_docker_image "$TAR_FILE"; then
                echo "Warning: Failed to load Docker image from $TAR_FILE"
                exit 1
            fi
        fi
    else
        echo "Warning: Could not extract image information from $TAR_FILE"
        exit 1
    fi

    # cleanup tar file
    rm -f "$TAR_FILE"
else
    echo "Warning: Docker image tar file $TAR_FILE not found in current directory"
fi

IMAGE_TAG=$(cat image_tag.txt)

# Export variables from .env file
set -a
source .env
set +a

# check if QUEUE_NAME is set
if [ -z "${QUEUE_NAME}" ]; then
    echo "Error: QUEUE_NAME is not set"
    exit 1
fi

# check if MOUNT_PATH is set
if [ -z "${MOUNT_PATH}" ]; then
    echo "Error: MOUNT_PATH is not set"
    exit 1
fi

# clean up batch-worker zip file
if [ -f "batch-worker.zip" ]; then
    rm -f "batch-worker.zip"
fi


# Start Celery worker with specified queue name and worker name in the background
CONTAINER_NAME="batch-worker-${QUEUE_NAME}"

docker run -d --name ${CONTAINER_NAME} --env-file .env -v ${MOUNT_PATH}:${MOUNT_PATH} -v ./local:/code/local --log-driver=json-file --log-opt max-size=10m --log-opt max-file=3 --restart unless-stopped ${IMAGE_TAG}

# Echo success message and exit
echo "Celery worker started successfully with QUEUE_NAME: ${QUEUE_NAME}"

exit 0
