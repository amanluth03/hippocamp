"""
AWS Lambda handler for FastAPI application.

This module wraps the FastAPI app with Mangum to make it compatible
with AWS Lambda and API Gateway.

Usage:
    In AWS Lambda, set the handler to: lambda_handler.handler
"""
from mangum import Mangum
from app.main import app

# Mangum adapter converts API Gateway events to ASGI
# lifespan="off" prevents startup/shutdown events which aren't
# supported in Lambda's ephemeral environment
handler = Mangum(app, lifespan="off")

