"""
AWS Bedrock service for AI-powered image analysis using Claude Haiku 4.5.

This service analyzes images to extract:
- Labels/tags (objects, scenes, activities detected in the image)
- Description (natural language description of the image content)
"""

import json
import base64
import logging
from typing import Optional
from dataclasses import dataclass

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ImageAnalysisResult:
    """Result from AI image analysis."""
    labels: list[str]  # ["beach", "sunset", "people", "ocean"]
    description: str   # "A beautiful sunset over the ocean with people walking on the beach"
    error: Optional[str] = None  # Error message if analysis failed


class BedrockService:
    """Service for AI image analysis using AWS Bedrock Claude Vision."""
    
    def __init__(self):
        self.enabled = settings.BEDROCK_ENABLED
        self.model_id = settings.BEDROCK_MODEL_ID
        self.region = settings.AWS_REGION or "us-east-1"
        
        if self.enabled:
            # Use default credential chain (IAM role in Lambda, ~/.aws/credentials locally)
            self.client = boto3.client(
                "bedrock-runtime",
                region_name=self.region
            )
            logger.info(f"BedrockService initialized: model={self.model_id}, region={self.region}")
        else:
            self.client = None
            logger.info("BedrockService disabled (BEDROCK_ENABLED=false)")
    
    def analyze_image(self, image_bytes: bytes, media_type: str = "image/jpeg") -> ImageAnalysisResult:
        """
        Analyze an image using Claude Haiku 4.5 vision capabilities.
        
        Args:
            image_bytes: Raw bytes of the image
            media_type: MIME type (image/jpeg, image/png, image/webp, image/gif)
            
        Returns:
            ImageAnalysisResult with labels and description
        """
        if not self.enabled or not self.client:
            logger.warning("Bedrock not enabled, skipping image analysis")
            return ImageAnalysisResult(
                labels=[],
                description="",
                error="Bedrock analysis disabled"
            )
        
        try:
            # Encode image as base64
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")
            
            # Build the prompt for Claude
            prompt = """Analyze this image and provide:

1. LABELS: A list of 5-15 single-word or short-phrase tags describing what you see. Include:
   - Objects (people, animals, items)
   - Scene/location (beach, restaurant, park, indoors)
   - Activities (eating, swimming, celebrating)
   - Mood/atmosphere (happy, romantic, adventurous)
   - Time of day if apparent (sunset, night)

2. DESCRIPTION: A brief 1-2 sentence natural description of the image.

Respond in this exact JSON format only, no other text:
{
  "labels": ["tag1", "tag2", "tag3"],
  "description": "A brief description of what's in the image."
}"""

            # Call Bedrock with Claude's Messages API format
            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            
            logger.info(f"Calling Bedrock model: {self.model_id}")
            
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            # Parse response
            response_body = json.loads(response["body"].read())
            
            # Extract the text content from Claude's response
            content = response_body.get("content", [])
            if not content:
                raise ValueError("Empty response from Bedrock")
            
            text_response = content[0].get("text", "")
            logger.debug(f"Bedrock raw response: {text_response}")
            
            # Parse the JSON from Claude's response
            # Claude might wrap it in markdown code blocks, so handle that
            json_text = text_response.strip()
            if json_text.startswith("```"):
                # Remove markdown code block
                lines = json_text.split("\n")
                json_text = "\n".join(lines[1:-1])
            
            result_data = json.loads(json_text)
            
            labels = result_data.get("labels", [])
            description = result_data.get("description", "")
            
            # Normalize labels: lowercase, limit to 15
            labels = [str(label).lower().strip() for label in labels[:15]]
            
            logger.info(f"Image analysis complete: {len(labels)} labels")
            
            return ImageAnalysisResult(
                labels=labels,
                description=description
            )
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = f"Bedrock API error: {error_code} - {str(e)}"
            logger.error(error_msg)
            return ImageAnalysisResult(
                labels=[],
                description="",
                error=error_msg
            )
        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse Bedrock response as JSON: {str(e)}"
            logger.error(error_msg)
            return ImageAnalysisResult(
                labels=[],
                description="",
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Unexpected error in image analysis: {type(e).__name__}: {str(e)}"
            logger.error(error_msg)
            return ImageAnalysisResult(
                labels=[],
                description="",
                error=error_msg
            )


# Singleton instance
bedrock_service = BedrockService()

