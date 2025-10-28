# Dockerfile
FROM ubuntu:22.04

# System deps
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      python3 python3-pip tesseract-ocr \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Lambda Runtime Interface Client (required for Lambda execution)
RUN pip3 install awslambdaric

# Set working directory
WORKDIR /var/task

# Copy application code
COPY src/ /var/task/

# Install Python dependencies
RUN pip3 install -r requirements.txt

# ENTRYPOINT runs the Lambda Runtime Interface Client
# CMD points to the unified Lambda handler
ENTRYPOINT ["python3", "-m", "awslambdaric"]
CMD ["lambda_function.lambda_handler"]
