# GitHub Actions CI/CD Setup

This directory contains the CI/CD pipeline for Hippo Campus.

## Workflow: `deploy.yml`

Triggered on push to `main` branch. Deploys:
1. **Frontend** → S3 bucket → CloudFront
2. **Backend** → Lambda function
3. **Migrations** → Runs Alembic against RDS

## Required GitHub Secrets

Before the workflow can run, configure these secrets in your repository:

### AWS Credentials
| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

### Infrastructure References
| Secret | Description | Example |
|--------|-------------|---------|
| `DOMAIN_NAME` | Your domain | `thehippocampus.net` |
| `S3_FRONTEND_BUCKET` | Frontend S3 bucket name | `hippocamp-frontend-prod` |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID | `E1234567890ABC` |
| `LAMBDA_FUNCTION_NAME` | Lambda function name | `hippocamp-api-prod` |
| `THUMBNAIL_LAMBDA_NAME` | Thumbnail Lambda name | `hippocamp-thumbnail-prod` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |

## How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret from the table above

## IAM User Permissions

Create an IAM user for GitHub Actions with these permissions:
- `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` on frontend bucket
- `lambda:UpdateFunctionCode`, `lambda:GetFunction` on Lambda function
- `cloudfront:CreateInvalidation` on CloudFront distribution

## Manual Deployment

You can also trigger a deployment manually:
1. Go to **Actions** tab
2. Select **Deploy** workflow
3. Click **Run workflow**

