"""
Embedding module for converting text segments to semantic vectors.

Uses sentence-transformers (paraphrase-multilingual-MiniLM-L12-v2) for fast,
offline embeddings that support 50+ languages including Spanish and English.
"""
import numpy as np
from typing import List, Dict
from sentence_transformers import SentenceTransformer


# Lazy-load model to avoid loading on import
_model = None


def get_model() -> SentenceTransformer:
    """
    Get or load the sentence transformer model.

    Uses paraphrase-multilingual-MiniLM-L12-v2 which supports:
    - Spanish, English, and 50+ other languages
    - 384-dimensional embeddings
    - Fast inference (similar speed to English-only models)

    Returns:
        Loaded SentenceTransformer model
    """
    global _model
    if _model is None:
        print("[embedding] Loading multilingual model 'paraphrase-multilingual-MiniLM-L12-v2'...")
        print("[embedding] This model supports Spanish, English, and 50+ languages")
        _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("[embedding] Model loaded successfully")
    return _model


def embed_segments(segments: List[Dict[str, any]]) -> np.ndarray:
    """
    Generate embeddings for a list of text segments.

    Args:
        segments: List of segment dicts with "text" key

    Returns:
        numpy array of shape (n_segments, embedding_dim)
        where embedding_dim = 384 for all-MiniLM-L6-v2
    """
    if not segments:
        print("[embedding] Warning: No segments to embed")
        return np.array([])

    print(f"[embedding] Generating embeddings for {len(segments)} segments...")

    # Extract text from segments
    texts = [seg["text"] for seg in segments]

    # Get model and generate embeddings
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)

    print(f"[embedding] Generated embeddings with shape {embeddings.shape}")

    return embeddings


def embed_text(text: str) -> np.ndarray:
    """
    Generate embedding for a single text string.

    Args:
        text: Text to embed

    Returns:
        numpy array of shape (embedding_dim,)
    """
    model = get_model()
    embedding = model.encode([text], show_progress_bar=False, convert_to_numpy=True)
    return embedding[0]
