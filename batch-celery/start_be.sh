# Activate the Conda environment
source activate base
conda activate tesbatch

# Update requests library to ensure compatibility
pip install --upgrade requests

# Check if pip command is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip command not found"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo ".env file not found"
  exit 1
fi

# Export variables from .env file
set -a
source .env
set +a

# Define log filename and append it to LOG_DIR
LOG_FILENAME="batch-be.log"
LOG_FILE="${LOG_DIR}${LOG_FILENAME}"
export LOG_FILE

# Install dependencies with verbose output and no-input option
timeout 300 pip install -r requirements.txt --verbose --no-input

# Check if pip install was successful
if [ $? -ne 0 ]; then
    echo "Error: pip install failed"
    exit 1
fi

# Run database migrations
python manage.py makemigrations celerytasks
python manage.py migrate

# Start the application in the background
nohup python manage.py runserver 0.0.0.0:8000 &

# Echo success message and exit
echo "Celery backend started successfully"

exit 0
