cd /Users/smlg/projects/me/sabuho/aws/sabuho-s3-process-uploaded-file
# Upload to AWS ECR (Amazon Elastic Container Registry)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 801935245468.dkr.ecr.us-east-1.amazonaws.com

docker buildx build --platform linux/amd64 -t ortosaurio/sabuho .
docker tag ortosaurio/sabuho:latest 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest
docker push 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest

#
aws lambda update-function-code \
  --function-name sabuhos3processuploadedfile \
  --image-uri 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest