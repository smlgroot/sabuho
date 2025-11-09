"""
Topic labeling module using TF-IDF to name clusters.

Extracts the most distinctive terms from each cluster to create interpretable topic names.
Language-agnostic implementation works for Spanish, English, and other languages.
"""
import re
from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np


def label_clusters(
    clustered_segments: Dict[int, List[Dict[str, any]]],
    top_n: int = 3
) -> Dict[int, str]:
    """
    Generate topic labels for each cluster using TF-IDF.

    Args:
        clustered_segments: Dict mapping cluster_id to list of segments
        top_n: Number of top terms to use for labeling (default: 3)

    Returns:
        Dict mapping cluster_id to topic label string
    """
    print(f"[labeling] Generating topic labels for {len(clustered_segments)} clusters...")

    labels = {}

    for cluster_id, segments in clustered_segments.items():
        label = _generate_label_for_cluster(segments, cluster_id, top_n)
        labels[cluster_id] = label

    return labels


def _generate_label_for_cluster(
    segments: List[Dict[str, any]],
    cluster_id: int,
    top_n: int
) -> str:
    """
    Generate a label for a single cluster using TF-IDF.

    Args:
        segments: List of segments in this cluster
        cluster_id: Cluster identifier
        top_n: Number of top terms to extract

    Returns:
        Topic label string
    """
    if not segments:
        return f"Topic {cluster_id + 1}"

    # Combine all segment texts
    texts = [seg["text"] for seg in segments]

    # If there's only one segment, try to extract a good label from it
    if len(texts) == 1:
        return _extract_label_from_single_segment(texts[0], cluster_id)

    # Use TF-IDF to find most important terms in this cluster
    try:
        # Configure TF-IDF vectorizer
        # Note: Using None for stop_words makes it language-agnostic (works for Spanish, English, etc.)
        vectorizer = TfidfVectorizer(
            max_features=50,  # Limit vocabulary
            stop_words=None,  # Language-agnostic (works for Spanish, English, etc.)
            ngram_range=(1, 2),  # Include unigrams and bigrams
            min_df=1,  # Must appear in at least 1 document
            max_df=0.95  # Ignore terms that appear in >95% of documents
        )

        # Fit TF-IDF on cluster segments
        tfidf_matrix = vectorizer.fit_transform(texts)

        # Get feature names (terms)
        feature_names = vectorizer.get_feature_names_out()

        # Calculate mean TF-IDF score for each term across all segments
        mean_tfidf = np.asarray(tfidf_matrix.mean(axis=0)).flatten()

        # Get top N terms by TF-IDF score
        top_indices = mean_tfidf.argsort()[-top_n:][::-1]
        top_terms = [feature_names[i] for i in top_indices if mean_tfidf[i] > 0]

        if top_terms:
            # Clean and format terms
            cleaned_terms = [_clean_term(term) for term in top_terms]
            label = " / ".join(cleaned_terms[:top_n])
            print(f"  - Cluster {cluster_id}: '{label}' (from {len(segments)} segments)")
            return label

    except Exception as e:
        print(f"[labeling] Warning: TF-IDF failed for cluster {cluster_id}: {e}")

    # Fallback: use generic label
    return f"Topic {cluster_id + 1}"


def _extract_label_from_single_segment(text: str, cluster_id: int) -> str:
    """
    Extract a meaningful label from a single segment.

    Tries to find:
    1. Header markers
    2. First capitalized sentence
    3. First few words

    Args:
        text: Segment text
        cluster_id: Cluster identifier

    Returns:
        Topic label
    """
    # Try to extract header marker
    header_match = re.search(r'### \[HEADER, SIZE=[\d.]+pt\](?:\s*\[BOLD\])?\s*(.+)', text)
    if header_match:
        return _clean_term(header_match.group(1).strip())

    # Try to get first line (might be a heading)
    first_line = text.split('\n')[0].strip()
    if first_line and len(first_line) < 100:
        # Clean numbering and special chars
        cleaned = re.sub(r'^(\d+\.)+\s*', '', first_line)
        cleaned = re.sub(r'^[IVXLCDM]+\.\s*', '', cleaned)
        cleaned = cleaned.strip()
        if cleaned:
            return _clean_term(cleaned)

    # Fallback: use first few significant words
    words = text.split()[:5]
    if words:
        label = " ".join(words)
        if len(label) > 50:
            label = label[:47] + "..."
        return _clean_term(label)

    return f"Topic {cluster_id + 1}"


def _clean_term(term: str) -> str:
    """
    Clean and format a term for use in topic label.

    Args:
        term: Raw term to clean

    Returns:
        Cleaned term
    """
    # Remove special characters (keep alphanumeric and spaces)
    term = re.sub(r'[^\w\s-]', '', term)

    # Remove extra whitespace
    term = ' '.join(term.split())

    # Capitalize first letter
    if term:
        term = term[0].upper() + term[1:]

    return term
