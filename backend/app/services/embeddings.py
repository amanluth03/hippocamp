"""
AWS Bedrock Titan Embeddings service for semantic search.

This service converts text (labels + descriptions) into vector embeddings
that can be used for similarity search.
"""

import json
import logging
from typing import Optional
from dataclasses import dataclass

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Titan Text Embeddings V2 produces 1024-dimensional vectors
EMBEDDING_DIMENSIONS = 1024


@dataclass
class EmbeddingResult:
    """Result from embedding generation."""
    embedding: Optional[list[float]]  # 1024-dimensional vector
    error: Optional[str] = None


class EmbeddingsService:
    """Service for generating text embeddings using AWS Bedrock Titan."""
    
    # Titan Text Embeddings V2 model ID
    MODEL_ID = "amazon.titan-embed-text-v2:0"
    
    def __init__(self):
        self.enabled = settings.BEDROCK_ENABLED  # Reuse the same flag
        self.region = settings.AWS_REGION or "us-east-1"
        
        if self.enabled:
            self.client = boto3.client(
                "bedrock-runtime",
                region_name=self.region
            )
            logger.info(f"EmbeddingsService initialized: model={self.MODEL_ID}, region={self.region}")
        else:
            self.client = None
            logger.info("EmbeddingsService disabled (BEDROCK_ENABLED=false)")
    
    def generate_embedding(self, text: str) -> EmbeddingResult:
        """
        Generate an embedding vector for the given text.
        
        Args:
            text: The text to embed (typically "{labels} {description}")
            
        Returns:
            EmbeddingResult with 1024-dimensional vector
        """
        if not self.enabled or not self.client:
            logger.warning("Embeddings service not enabled, skipping")
            return EmbeddingResult(
                embedding=None,
                error="Embeddings service disabled"
            )
        
        if not text or not text.strip():
            logger.warning("Empty text provided for embedding")
            return EmbeddingResult(
                embedding=None,
                error="Empty text"
            )
        
        try:
            # Titan Embeddings V2 request format
            request_body = {
                "inputText": text[:8000],  # Titan has ~8k token limit
                "dimensions": EMBEDDING_DIMENSIONS,
                "normalize": True  # Normalize for cosine similarity
            }
            
            logger.debug(f"Generating embedding for text: {text[:100]}...")
            
            response = self.client.invoke_model(
                modelId=self.MODEL_ID,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding")
            
            if not embedding:
                raise ValueError("No embedding in response")
            
            logger.info(f"Generated embedding with {len(embedding)} dimensions")
            
            return EmbeddingResult(embedding=embedding)
            
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "Unknown")
            error_msg = f"Titan Embeddings API error: {error_code} - {str(e)}"
            logger.error(error_msg)
            return EmbeddingResult(embedding=None, error=error_msg)
        except Exception as e:
            error_msg = f"Unexpected error generating embedding: {type(e).__name__}: {str(e)}"
            logger.error(error_msg)
            return EmbeddingResult(embedding=None, error=error_msg)
    
    def generate_embedding_for_photo(
        self, 
        labels: list[str], 
        description: str
    ) -> EmbeddingResult:
        """
        Generate an embedding for a photo based on its AI-generated metadata.
        
        Combines labels and description into a single text for embedding.
        
        Args:
            labels: AI-generated labels/tags
            description: AI-generated description
            
        Returns:
            EmbeddingResult with embedding vector
        """
        # Combine labels and description into searchable text
        labels_text = " ".join(labels) if labels else ""
        combined_text = f"{labels_text} {description}".strip()
        
        if not combined_text:
            return EmbeddingResult(
                embedding=None,
                error="No labels or description to embed"
            )
        
        return self.generate_embedding(combined_text)
    
    def generate_query_embedding(self, query: str) -> EmbeddingResult:
        """
        Generate an embedding for a search query.
        
        Args:
            query: User's search query
            
        Returns:
            EmbeddingResult with embedding vector
        """
        return self.generate_embedding(query)


# Singleton instance
embeddings_service = EmbeddingsService()
