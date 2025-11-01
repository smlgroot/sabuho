FROM ubuntu:22.04

# 1. Set envs in ONE layer
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# 2. Install system deps in ONE RUN
RUN apt-get update && \
    apt-get install -y \
        python3.10 \
        python3-pip \
        tesseract-ocr \
        tesseract-ocr-eng \
        libgl1-mesa-glx \
        libglib2.0-0 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Separate deps from code for better caching
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# 4. Now copy the app
COPY src/ .

CMD ["python3", "main.py"]
