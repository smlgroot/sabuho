# EFS Deployment Guide for PaddleOCR Models

This guide explains how to set up EFS (Elastic File System) to cache PaddleOCR models for production ECS deployment, while maintaining local development capabilities.

## Overview

**Problem:** PaddleOCR downloads ~150-300MB of models on first run, causing 2-5 minute startup delays.

**Solution:** Use EFS to cache models across all ECS tasks:
- ✅ First task downloads models to EFS
- ✅ Subsequent tasks use cached models (instant startup)
- ✅ Shared across all container instances
- ✅ Persists across deployments

## Architecture

```
┌─────────────────────────────────────────────────┐
│              ECS Cluster                        │
│                                                 │
│  ┌──────────────┐         ┌──────────────┐    │
│  │  ECS Task 1  │         │  ECS Task 2  │    │
│  │  (Container) │         │  (Container) │    │
│  └──────┬───────┘         └──────┬───────┘    │
│         │                        │             │
│         └────────┬───────────────┘             │
│                  │                              │
│                  ▼                              │
│         ┌────────────────┐                     │
│         │  EFS Mount     │                     │
│         │ /paddleocr-    │                     │
│         │   models/      │                     │
│         └────────────────┘                     │
└─────────────────────────────────────────────────┘
```

## Step 1: Create EFS File System

### Using AWS Console

1. **Navigate to EFS:**
   - Go to AWS Console → EFS → Create file system

2. **Configure:**
   - **Name:** `sabuho-paddleocr-models`
   - **VPC:** Same VPC as your ECS cluster
   - **Availability:** Regional (recommended)
   - **Performance mode:** General Purpose
   - **Throughput mode:** Bursting (or Provisioned for high load)

3. **Security Group:**
   - Create or use existing security group
   - **Inbound rule:** NFS (port 2049) from ECS task security group

4. **Encryption:**
   - Enable encryption at rest (recommended)
   - Enable encryption in transit

5. **Create** and note the **File System ID** (e.g., `fs-0a1b2c3d4e5f6g7h8`)

### Using AWS CLI

```bash
# Create EFS file system
aws efs create-file-system \
  --region us-east-1 \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=sabuho-paddleocr-models \
  --output json

# Note the FileSystemId from output
```

### Create Mount Targets

You need mount targets in each subnet where your ECS tasks run:

```bash
# Get your VPC subnets
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=vpc-XXXXXXXX" \
  --query 'Subnets[*].[SubnetId,AvailabilityZone]' \
  --output table

# Create mount target in each subnet
aws efs create-mount-target \
  --file-system-id fs-XXXXXXXXX \
  --subnet-id subnet-XXXXXXXXX \
  --security-groups sg-XXXXXXXXX
```

## Step 2: Update ECS Task Definition

The file `ecs-task-definition.json` has been created with EFS configuration.

**Key sections:**

```json
{
  "volumes": [
    {
      "name": "paddleocr-models",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-XXXXXXXXX",  // ← Replace with your EFS ID
        "rootDirectory": "/paddleocr-models",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "iam": "ENABLED"
        }
      }
    }
  ],
  "containerDefinitions": [
    {
      "mountPoints": [
        {
          "sourceVolume": "paddleocr-models",
          "containerPath": "/root/.paddlex",
          "readOnly": false
        }
      ]
    }
  ]
}
```

### Register Task Definition

```bash
# Update the fileSystemId in ecs-task-definition.json first!

# Register the task definition
aws ecs register-task-definition \
  --cli-input-json file://ecs-task-definition.json
```

## Step 3: Update IAM Permissions

Your ECS task execution role needs EFS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite",
        "elasticfilesystem:ClientRootAccess"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:801935245468:file-system/fs-XXXXXXXXX",
      "Condition": {
        "StringEquals": {
          "elasticfilesystem:AccessPointArn": "arn:aws:elasticfilesystem:us-east-1:801935245468:access-point/fsap-XXXXXXXXX"
        }
      }
    }
  ]
}
```

Or simpler (less restrictive):

```bash
aws iam attach-role-policy \
  --role-name sabuho-processor-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonElasticFileSystemClientReadWriteAccess
```

## Step 4: Security Group Configuration

Your ECS tasks need to reach EFS mount targets:

```bash
# Get your ECS task security group ID
ECS_SG=sg-XXXXXXXXX

# Get your EFS mount target security group ID
EFS_SG=sg-YYYYYYYYY

# Add inbound rule to EFS security group
aws ec2 authorize-security-group-ingress \
  --group-id $EFS_SG \
  --protocol tcp \
  --port 2049 \
  --source-group $ECS_SG
```

## Step 5: Deploy

### Build and Push Image

```bash
# Build for linux/amd64
docker buildx build --platform linux/amd64 -t ortosaurio/sabuho:latest .

# Authenticate to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  801935245468.dkr.ecr.us-east-1.amazonaws.com

# Tag and push
docker tag ortosaurio/sabuho:latest \
  801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest

docker push 801935245468.dkr.ecr.us-east-1.amazonaws.com/ortosaurio/sabuho:latest
```

### Update ECS Service

```bash
# Update service to use new task definition
aws ecs update-service \
  --cluster sabuho-cluster \
  --service sabuho-processor-service \
  --task-definition sabuho-processor \
  --force-new-deployment
```

## Local Development

For local testing, docker-compose uses a Docker volume (already configured):

```yaml
volumes:
  - ./src:/app:ro
  - paddleocr-models:/root/.paddlex  # ← Local Docker volume

volumes:
  paddleocr-models:  # ← Persists across container restarts
```

### Local Testing Commands

```bash
# First run (downloads models)
docker-compose up

# Models are cached in Docker volume
# Subsequent runs use cached models
docker-compose down
docker-compose up  # ← Fast startup, no download

# Clear cache to test fresh download
docker volume rm sabuho-process-document-hub_paddleocr-models
```

## Verification

### Check EFS Mount in Running Container

```bash
# Get container ID
aws ecs list-tasks \
  --cluster sabuho-cluster \
  --service-name sabuho-processor-service

# Check logs for model download
aws logs tail /ecs/sabuho-processor --follow
```

### Expected First Run Logs

```
[INFO] PaddleOCR initialized successfully with Spanish language
Creating model: ('PP-LCNet_x1_0_doc_ori', None)
Using official model, downloading to /root/.paddlex/official_models/
```

### Expected Subsequent Runs

```
[INFO] PaddleOCR initialized successfully with Spanish language
[INFO] Using cached models from /root/.paddlex/
```

## Monitoring

### Check EFS Usage

```bash
aws efs describe-file-systems \
  --file-system-id fs-XXXXXXXXX \
  --query 'FileSystems[0].SizeInBytes'
```

### CloudWatch Metrics

Monitor in CloudWatch:
- **ClientConnections:** Should show active ECS tasks
- **DataReadIOBytes:** Should be high on first task, lower on subsequent
- **PermittedThroughput:** Ensure you're not hitting limits

## Costs

**EFS Pricing (us-east-1):**
- **Storage:** $0.30/GB-month (Standard), $0.016/GB-month (Infrequent Access)
- **Throughput:** Included in Bursting mode
- **Expected usage:** ~0.3-0.5 GB for PaddleOCR models
- **Monthly cost:** ~$0.10-$0.15 (negligible)

**Cost savings:**
- ✅ Eliminates repeated model downloads from internet
- ✅ Faster task startup = lower compute time
- ✅ Reduced data transfer costs

## Troubleshooting

### Issue: Container can't mount EFS

**Check:**
1. EFS mount targets exist in same subnets as ECS tasks
2. Security group allows NFS (port 2049) from ECS tasks
3. Task role has EFS permissions
4. File system ID is correct in task definition

```bash
# Check mount targets
aws efs describe-mount-targets \
  --file-system-id fs-XXXXXXXXX
```

### Issue: Models still downloading every time

**Check:**
1. EFS is actually mounted: `df -h` in container
2. Models are being written to `/root/.paddlex/`
3. Container has write permissions to EFS
4. EFS is not read-only in task definition

### Issue: Permission denied

**Solutions:**
```bash
# Option 1: Use EFS Access Points with specific UID/GID
# Option 2: Ensure task role has ClientRootAccess permission
# Option 3: Set permissions in EFS after first mount
```

## Best Practices

1. **Use EFS Access Points** for better permission control
2. **Enable encryption** in transit and at rest
3. **Set lifecycle policies** to move old files to Infrequent Access
4. **Monitor CloudWatch metrics** for performance issues
5. **Use same availability zones** as ECS tasks for lower latency
6. **Backup EFS** if you customize models or add languages

## Alternative: Pre-download to EFS

If you want to avoid the first-run download in production:

```bash
# 1. Launch a temporary ECS task with EFS mounted
# 2. Exec into container
aws ecs execute-command \
  --cluster sabuho-cluster \
  --task <task-id> \
  --container sabuho-processor \
  --interactive \
  --command "/bin/bash"

# 3. Inside container, initialize PaddleOCR
python3 -c "from paddleocr import PaddleOCR; PaddleOCR(lang='es', use_doc_orientation_classify=True, use_textline_orientation=True)"

# 4. Models are now cached in EFS
# 5. Stop the task
```

## Summary

| Environment | Storage | First Run | Subsequent Runs |
|-------------|---------|-----------|-----------------|
| **Local (docker-compose)** | Docker volume | 2-5 min download | Instant (cached) |
| **ECS (with EFS)** | EFS | 2-5 min download | Instant (cached) |
| **ECS (without EFS)** | Container | 2-5 min download | 2-5 min download (every time) |

✅ **Recommended:** Use EFS for production ECS deployment
✅ **Already configured:** Local docker-compose with volume caching
✅ **Cost-effective:** ~$0.10-$0.15/month for EFS storage
