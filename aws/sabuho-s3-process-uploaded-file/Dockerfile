# Dockerfile
FROM ubuntu:22.04

# System deps
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      python3 python3-pip tesseract-ocr \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Lambda Runtime Interface Client (critical piece you were missing)
RUN pip3 install awslambdaric

# Code
WORKDIR /var/task
COPY src/ /var/task/

# Python deps
RUN pip3 install -r requirements.txt

# ENTRYPOINT runs the RIC, CMD points to your handler
ENTRYPOINT ["python3", "-m", "awslambdaric"]
CMD ["lambda_function.lambda_handler"]
