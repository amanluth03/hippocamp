"""
Search Intelligence Service for natural language query interpretation.

This service interprets user search queries and extracts:
- Date ranges (e.g., "last week", "summer 2025")
- Keywords/semantic intent (e.g., "beach", "happy moments")

Phase 1: Pre-computed date patterns + Bedrock for complex queries
Phase 2: Will add vector search with pgvector + Titan Embeddings
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, field
from functools import lru_cache

logger = logging.getLogger(__name__)


@dataclass
class SearchIntent:
    """Parsed search intent from a natural language query."""
    original_query: str
    keywords: list[str] = field(default_factory=list)
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    used_ai: bool = False  # True if Bedrock was used to interpret
    confidence: float = 1.0  # How confident we are in the interpretation
    
    @property
    def has_date_filter(self) -> bool:
        return self.date_start is not None or self.date_end is not None


class DatePatternMatcher:
    """
    Fast, pre-computed date pattern matching.
    No API calls needed - handles common date expressions.
    """
    
    # Patterns that we can handle without AI
    RELATIVE_PATTERNS = {
        r'\b(today)\b': lambda: (
            datetime.now().replace(hour=0, minute=0, second=0, microsecond=0),
            datetime.now()
        ),
        r'\b(yesterday)\b': lambda: (
            (datetime.now() - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0),
            (datetime.now() - timedelta(days=1)).replace(hour=23, minute=59, second=59)
        ),
        r'\blast\s*week\b': lambda: (
            datetime.now() - timedelta(days=7),
            datetime.now()
        ),
        r'\blast\s*month\b': lambda: (
            datetime.now() - timedelta(days=30),
            datetime.now()
        ),
        r'\blast\s*year\b': lambda: (
            datetime.now() - timedelta(days=365),
            datetime.now()
        ),
        r'\bthis\s*week\b': lambda: (
            datetime.now() - timedelta(days=datetime.now().weekday()),
            datetime.now()
        ),
        r'\bthis\s*month\b': lambda: (
            datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0),
            datetime.now()
        ),
        r'\bthis\s*year\b': lambda: (
            datetime.now().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0),
            datetime.now()
        ),
        r'\b(\d+)\s*days?\s*ago\b': lambda m: (
            datetime.now() - timedelta(days=int(m.group(1))),
            datetime.now() - timedelta(days=int(m.group(1)) - 1)
        ),
        r'\b(\d+)\s*weeks?\s*ago\b': lambda m: (
            datetime.now() - timedelta(weeks=int(m.group(1))),
            datetime.now() - timedelta(weeks=int(m.group(1)) - 1)
        ),
        r'\b(\d+)\s*months?\s*ago\b': lambda m: (
            datetime.now() - timedelta(days=int(m.group(1)) * 30),
            datetime.now() - timedelta(days=(int(m.group(1)) - 1) * 30)
        ),
    }
    
    # Season patterns
    SEASON_PATTERNS = {
        r'\bspring\s*(\d{4})?\b': lambda m: _get_season_dates('spring', m),
        r'\bsummer\s*(\d{4})?\b': lambda m: _get_season_dates('summer', m),
        r'\bfall\s*(\d{4})?\b': lambda m: _get_season_dates('fall', m),
        r'\bautumn\s*(\d{4})?\b': lambda m: _get_season_dates('fall', m),
        r'\bwinter\s*(\d{4})?\b': lambda m: _get_season_dates('winter', m),
    }
    
    # Month patterns
    MONTH_NAMES = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
    ]
    
    @classmethod
    def extract_date_range(cls, query: str) -> tuple[Optional[datetime], Optional[datetime], str]:
        """
        Extract date range from query and return remaining query text.
        
        Returns:
            (date_start, date_end, remaining_query)
        """
        query_lower = query.lower()
        remaining = query
        
        # Try relative patterns first
        for pattern, date_func in cls.RELATIVE_PATTERNS.items():
            match = re.search(pattern, query_lower, re.IGNORECASE)
            if match:
                try:
                    if callable(date_func):
                        # Check if the function expects a match object
                        import inspect
                        sig = inspect.signature(date_func)
                        if len(sig.parameters) > 0:
                            dates = date_func(match)
                        else:
                            dates = date_func()
                        
                        # Remove the matched date text from query
                        remaining = re.sub(pattern, '', remaining, flags=re.IGNORECASE).strip()
                        return dates[0], dates[1], remaining
                except Exception as e:
                    logger.warning(f"Error parsing date pattern {pattern}: {e}")
                    continue
        
        # Try season patterns
        for pattern, date_func in cls.SEASON_PATTERNS.items():
            match = re.search(pattern, query_lower, re.IGNORECASE)
            if match:
                try:
                    dates = date_func(match)
                    remaining = re.sub(pattern, '', remaining, flags=re.IGNORECASE).strip()
                    return dates[0], dates[1], remaining
                except Exception as e:
                    logger.warning(f"Error parsing season pattern {pattern}: {e}")
                    continue
        
        # Try month + year pattern (e.g., "December 2025", "Dec 2025")
        month_pattern = r'\b(' + '|'.join(cls.MONTH_NAMES) + r'|' + '|'.join([m[:3] for m in cls.MONTH_NAMES]) + r')\s*(\d{4})?\b'
        match = re.search(month_pattern, query_lower, re.IGNORECASE)
        if match:
            month_str = match.group(1).lower()
            year_str = match.group(2)
            
            # Find month number
            month_num = None
            for i, name in enumerate(cls.MONTH_NAMES):
                if name.startswith(month_str[:3]):
                    month_num = i + 1
                    break
            
            if month_num:
                year = int(year_str) if year_str else datetime.now().year
                start = datetime(year, month_num, 1)
                # End of month
                if month_num == 12:
                    end = datetime(year + 1, 1, 1) - timedelta(seconds=1)
                else:
                    end = datetime(year, month_num + 1, 1) - timedelta(seconds=1)
                
                remaining = re.sub(month_pattern, '', remaining, flags=re.IGNORECASE).strip()
                return start, end, remaining
        
        # Try just year pattern (e.g., "2025", "in 2024")
        year_pattern = r'\b(in\s*)?(\d{4})\b'
        match = re.search(year_pattern, query_lower)
        if match:
            year = int(match.group(2))
            if 2000 <= year <= 2100:  # Reasonable year range
                start = datetime(year, 1, 1)
                end = datetime(year, 12, 31, 23, 59, 59)
                remaining = re.sub(year_pattern, '', remaining, flags=re.IGNORECASE).strip()
                return start, end, remaining
        
        return None, None, remaining


def _get_season_dates(season: str, match) -> tuple[datetime, datetime]:
    """Get date range for a season, optionally with a specific year."""
    year_str = match.group(1) if match.lastindex and match.group(1) else None
    year = int(year_str) if year_str else datetime.now().year
    
    seasons = {
        'spring': (3, 1, 5, 31),   # March 1 - May 31
        'summer': (6, 1, 8, 31),   # June 1 - August 31
        'fall': (9, 1, 11, 30),    # September 1 - November 30
        'winter': (12, 1, 2, 28),  # December 1 - February 28/29
    }
    
    start_month, start_day, end_month, end_day = seasons[season]
    
    if season == 'winter':
        # Winter spans two years
        start = datetime(year, start_month, start_day)
        end = datetime(year + 1, end_month, end_day, 23, 59, 59)
    else:
        start = datetime(year, start_month, start_day)
        end = datetime(year, end_month, end_day, 23, 59, 59)
    
    return start, end


class SearchIntelligenceService:
    """
    Main service for interpreting natural language search queries.
    
    Uses a tiered approach:
    1. Fast path: Pre-computed date patterns (no API call)
    2. Simple keywords: Direct text search
    3. Complex queries: Bedrock interpretation (cached)
    """
    
    def __init__(self):
        self._cache: dict[str, SearchIntent] = {}
        self._cache_max_size = 1000
        logger.info("SearchIntelligenceService initialized")
    
    def interpret_query(self, query: str) -> SearchIntent:
        """
        Interpret a natural language search query.
        
        Args:
            query: User's search query (e.g., "beach photos from last summer")
            
        Returns:
            SearchIntent with extracted date range and keywords
        """
        query = query.strip()
        
        # Check cache first
        cache_key = query.lower()
        if cache_key in self._cache:
            logger.debug(f"Cache hit for query: {query}")
            return self._cache[cache_key]
        
        # Extract date range using fast pattern matching
        date_start, date_end, remaining_query = DatePatternMatcher.extract_date_range(query)
        
        # Clean up remaining query to extract keywords
        keywords = self._extract_keywords(remaining_query)
        
        # Determine if we need AI interpretation
        needs_ai = self._needs_ai_interpretation(remaining_query, keywords)
        
        if needs_ai:
            # For Phase 1, we'll add Bedrock interpretation here
            # For now, just use the extracted keywords
            intent = SearchIntent(
                original_query=query,
                keywords=keywords,
                date_start=date_start,
                date_end=date_end,
                used_ai=False,
                confidence=0.7 if date_start or keywords else 0.5
            )
        else:
            intent = SearchIntent(
                original_query=query,
                keywords=keywords,
                date_start=date_start,
                date_end=date_end,
                used_ai=False,
                confidence=1.0
            )
        
        # Cache the result
        self._cache_result(cache_key, intent)
        
        logger.info(
            f"Query interpreted: '{query}' -> keywords={keywords}, "
            f"dates={date_start} to {date_end}, ai={intent.used_ai}"
        )
        
        return intent
    
    def _extract_keywords(self, query: str) -> list[str]:
        """Extract meaningful keywords from query text."""
        # Remove common stop words
        stop_words = {
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
            'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
            'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
            'photos', 'photo', 'pictures', 'picture', 'pics', 'images', 'image',
            'show', 'me', 'my', 'find', 'search', 'get', 'all', 'any', 'some'
        }
        
        # Split and clean
        words = re.findall(r'\b\w+\b', query.lower())
        keywords = [w for w in words if w not in stop_words and len(w) > 1]
        
        return keywords
    
    def _needs_ai_interpretation(self, query: str, keywords: list[str]) -> bool:
        """
        Determine if a query needs AI interpretation.
        
        Returns True for complex queries that benefit from semantic understanding.
        """
        # Phrases that suggest complex/abstract queries
        complex_indicators = [
            'happy', 'sad', 'fun', 'beautiful', 'best', 'favorite',
            'moments', 'memories', 'times', 'adventures',
            'like', 'similar', 'about', 'related'
        ]
        
        query_lower = query.lower()
        
        # Check for complex indicators
        for indicator in complex_indicators:
            if indicator in query_lower:
                return True
        
        # Multiple keywords might benefit from AI understanding
        if len(keywords) > 3:
            return True
        
        return False
    
    def _cache_result(self, key: str, intent: SearchIntent):
        """Cache a query interpretation with LRU-style eviction."""
        if len(self._cache) >= self._cache_max_size:
            # Remove oldest entries (first 10%)
            keys_to_remove = list(self._cache.keys())[:self._cache_max_size // 10]
            for k in keys_to_remove:
                del self._cache[k]
        
        self._cache[key] = intent
    
    def clear_cache(self):
        """Clear the query interpretation cache."""
        self._cache.clear()
        logger.info("Search intelligence cache cleared")


# Singleton instance
search_intelligence = SearchIntelligenceService()
