"""
Clustering module for grouping semantically similar segments.

Uses KMeans clustering with configurable k for topic identification.
"""
import numpy as np
from typing import List, Dict, Tuple
from sklearn.cluster import KMeans


def cluster_segments(
    embeddings: np.ndarray,
    segments: List[Dict[str, any]],
    n_clusters: int = None,
    max_clusters: int = 10
) -> Tuple[List[int], int]:
    """
    Cluster segments using KMeans on their embeddings.

    Args:
        embeddings: numpy array of shape (n_segments, embedding_dim)
        segments: List of segment dicts (for determining optimal k)
        n_clusters: Number of clusters (if None, auto-determine)
        max_clusters: Maximum number of clusters to consider

    Returns:
        Tuple of (cluster_labels, n_clusters_used)
        - cluster_labels: List of cluster IDs for each segment
        - n_clusters_used: Actual number of clusters created
    """
    n_segments = len(segments)

    if n_segments == 0:
        print("[clustering] Warning: No segments to cluster")
        return [], 0

    # Determine optimal number of clusters if not specified
    if n_clusters is None:
        n_clusters = _determine_optimal_clusters(n_segments, max_clusters)

    print(f"[clustering] Clustering {n_segments} segments into {n_clusters} clusters...")

    # Handle edge case: more clusters requested than segments
    if n_clusters >= n_segments:
        print(f"[clustering] Warning: n_clusters ({n_clusters}) >= n_segments ({n_segments}), assigning each segment to its own cluster")
        return list(range(n_segments)), n_segments

    # Perform KMeans clustering
    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10,
        max_iter=300
    )

    cluster_labels = kmeans.fit_predict(embeddings)

    print(f"[clustering] Clustering complete. Cluster distribution:")
    _print_cluster_distribution(cluster_labels)

    return cluster_labels.tolist(), n_clusters


def _determine_optimal_clusters(n_segments: int, max_clusters: int) -> int:
    """
    Determine optimal number of clusters based on document size.

    Heuristic:
    - Very small documents (< 5 segments): 1-2 clusters
    - Small documents (5-15 segments): 2-3 clusters
    - Medium documents (15-30 segments): 3-5 clusters
    - Large documents (30+ segments): 5-10 clusters

    Args:
        n_segments: Number of segments in document
        max_clusters: Maximum allowed clusters

    Returns:
        Optimal number of clusters
    """
    if n_segments < 5:
        optimal = min(2, n_segments)
    elif n_segments < 15:
        optimal = min(3, n_segments)
    elif n_segments < 30:
        optimal = min(5, n_segments)
    else:
        # For large documents, use roughly sqrt(n) clusters, capped
        optimal = min(int(np.sqrt(n_segments)), max_clusters)

    print(f"[clustering] Auto-determined optimal clusters: {optimal} (for {n_segments} segments)")

    return optimal


def _print_cluster_distribution(cluster_labels: np.ndarray) -> None:
    """
    Print distribution of segments across clusters.

    Args:
        cluster_labels: Array of cluster assignments
    """
    unique, counts = np.unique(cluster_labels, return_counts=True)

    for cluster_id, count in zip(unique, counts):
        print(f"  - Cluster {cluster_id}: {count} segments")


def assign_segments_to_clusters(
    segments: List[Dict[str, any]],
    cluster_labels: List[int]
) -> Dict[int, List[Dict[str, any]]]:
    """
    Group segments by their cluster assignments.

    Args:
        segments: List of segment dicts
        cluster_labels: List of cluster IDs (same length as segments)

    Returns:
        Dict mapping cluster_id to list of segments in that cluster
    """
    clusters = {}

    for segment, cluster_id in zip(segments, cluster_labels):
        if cluster_id not in clusters:
            clusters[cluster_id] = []
        clusters[cluster_id].append(segment)

    return clusters
