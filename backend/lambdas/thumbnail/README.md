# Thumbnail Generator Lambda

Automatically generates thumbnail images when photos are uploaded to S3.

## What it does

When a photo is uploaded to the S3 photos bucket:
1. Lambda is triggered by S3 event
2. Downloads the original image
3. Generates two thumbnails:
   - `_thumb.webp` - 300px wide (for grid views)
   - `_medium.webp` - 1200px wide (for detail views)
4. Uploads thumbnails back to S3 alongside the original

## File naming

```
Original:  memories/user123/20240101_abc123.jpg
Thumb:     memories/user123/20240101_abc123_thumb.webp
Medium:    memories/user123/20240101_abc123_medium.webp
```

## Deployment

### Option 1: Deploy via CI/CD (Recommended)

The GitHub Actions workflow can be extended to deploy this Lambda.

### Option 2: Manual deployment

```bash
# From this directory
zip -r handler.zip handler.py

# Deploy to AWS
aws lambda update-function-code \
  --function-name hippocamp-thumbnail-prod \
  --zip-file fileb://handler.zip \
  --region us-east-1
```

## Dependencies

This Lambda uses the Klayers Pillow layer (pre-compiled for Lambda).
The layer is automatically attached via Terraform.

## Testing locally

```bash
# Install dependencies
pip install pillow boto3

# Run with test event
python -c "
from handler import handler
event = {
    'Records': [{
        's3': {
            'bucket': {'name': 'your-bucket'},
            'object': {'key': 'test/image.jpg'}
        }
    }]
}
handler(event, None)
"
```

## Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| Thumb size | 300px | Grid view thumbnails |
| Medium size | 1200px | Detail view images |
| Format | WebP | ~30% smaller than JPEG |
| Quality | 90 | Visually lossless |
| Timeout | 60s | Allows processing large images |
| Memory | 1024MB | More memory = faster processing |

