FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y python3 python3-pip tesseract-ocr && \
    apt-get clean

COPY src/ /var/task/
WORKDIR /var/task

RUN pip3 install -r requirements.txt

CMD ["lambda_function.lambda_handler"]
