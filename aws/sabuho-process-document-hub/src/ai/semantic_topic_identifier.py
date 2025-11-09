"""
Semantic topic identification using ML-based clustering.

This module identifies topics from OCR text using:
1. Text segmentation (heading patterns, paragraph boundaries)
2. Semantic embeddings (sentence-transformers multilingual model)
3. KMeans clustering
4. TF-IDF based topic labeling

This approach:
- Works on unstructured documents (no headers needed)
- Understands semantic relationships
- Supports multiple languages (Spanish, English, 50+ others)
- Runs offline (no API calls)
- Fast and cost-free
- Robust to poor formatting
"""
from typing import Dict, List
from .segmentation import segment_text
from .embedding import embed_segments
from .clustering import cluster_segments, assign_segments_to_clusters
from .labeling import label_clusters


def identify_topics_semantic(
    text: str,
    n_clusters: int = None,
    max_clusters: int = 10,
    min_segment_length: int = 100
) -> Dict:
    """
    Identify topics from text using semantic clustering.

    Args:
        text: Full OCR text with page markers
              Format: "--- Page X ---" with optional "### [HEADER, SIZE=Xpt]" markers
        n_clusters: Number of topics to identify (None = auto-determine)
        max_clusters: Maximum number of clusters (default: 10)
        min_segment_length: Minimum character length for segments (default: 100)

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}
    """
    print("[semantic_topic_identifier] Starting ML-based topic identification...")
    print(f"  - Config: n_clusters={n_clusters}, max_clusters={max_clusters}")

    # Step 1: Segment the text
    segments = segment_text(text, min_segment_length=min_segment_length)

    if not segments:
        print("[semantic_topic_identifier] No segments found in text")
        return {"topics": []}

    if len(segments) == 1:
        print("[semantic_topic_identifier] Only one segment found, creating single topic")
        return {
            "topics": [{
                "name": "Document Content",
                "start": segments[0]["page"],
                "end": segments[0]["page"]
            }]
        }

    # Step 2: Generate embeddings
    embeddings = embed_segments(segments)

    if embeddings.size == 0:
        print("[semantic_topic_identifier] Failed to generate embeddings")
        return {"topics": []}

    # Step 3: Cluster segments
    cluster_labels, n_clusters_used = cluster_segments(
        embeddings,
        segments,
        n_clusters=n_clusters,
        max_clusters=max_clusters
    )

    if not cluster_labels:
        print("[semantic_topic_identifier] Clustering failed")
        return {"topics": []}

    # Step 4: Group segments by cluster
    clustered_segments = assign_segments_to_clusters(segments, cluster_labels)

    # Step 5: Generate topic labels
    cluster_labels_dict = label_clusters(clustered_segments, top_n=3)

    # Step 6: Convert clusters to topic format (with page ranges)
    topics = _create_topics_from_clusters(
        clustered_segments,
        cluster_labels_dict,
        cluster_labels
    )

    print(f"[semantic_topic_identifier] Identified {len(topics)} topics")

    # Print topics for visibility
    for topic in topics:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

    return {"topics": topics}


def _create_topics_from_clusters(
    clustered_segments: Dict[int, List[Dict]],
    cluster_labels: Dict[int, str],
    segment_cluster_labels: List[int]
) -> List[Dict]:
    """
    Convert clusters to topic format with page ranges.

    Strategy:
    - Order topics by first appearance in document (not cluster ID)
    - Calculate page range for each topic
    - Merge adjacent segments from same cluster if they're on consecutive pages

    Args:
        clustered_segments: Dict mapping cluster_id to list of segments
        cluster_labels: Dict mapping cluster_id to topic name
        segment_cluster_labels: Original cluster assignments in segment order

    Returns:
        List of topic dicts: [{"name": "...", "start": 1, "end": 5}, ...]
    """
    if not clustered_segments:
        return []

    topics = []

    # Track which clusters we've processed
    seen_clusters = set()

    # Process clusters in order of first appearance
    for cluster_id in segment_cluster_labels:
        if cluster_id in seen_clusters:
            continue

        seen_clusters.add(cluster_id)

        # Get segments for this cluster
        segments = clustered_segments[cluster_id]

        if not segments:
            continue

        # Get topic name
        topic_name = cluster_labels.get(cluster_id, f"Topic {cluster_id + 1}")

        # Calculate page range
        pages = [seg["page"] for seg in segments]
        start_page = min(pages)
        end_page = max(pages)

        topics.append({
            "name": topic_name,
            "start": start_page,
            "end": end_page
        })

    # Sort topics by start page (natural document order)
    topics.sort(key=lambda t: t["start"])

    return topics
