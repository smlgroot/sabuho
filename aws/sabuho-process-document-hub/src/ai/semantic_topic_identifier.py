"""
Semantic topic identification using BERTopic.

This module identifies topics from OCR text using:
1. Text segmentation (heading patterns, paragraph boundaries)
2. BERTopic pipeline:
   - Semantic embeddings (sentence-transformers multilingual model)
   - UMAP dimensionality reduction
   - HDBSCAN clustering (automatically finds optimal number of clusters)
   - c-TF-IDF topic labeling

This approach:
- Works on unstructured documents (no headers needed)
- Understands semantic relationships
- Supports multiple languages (Spanish, English, 50+ others)
- Runs offline (no API calls)
- Fast and cost-free
- Robust to poor formatting
- Automatically determines number of topics
"""
from typing import Dict, List
import re
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import CountVectorizer
from .segmentation import segment_text

# Spanish stop words (common articles, prepositions, pronouns, verbs)
SPANISH_STOP_WORDS = [
    # Articles, prepositions
    'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
    'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o',
    'este', 'sí', 'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también',
    'me', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos',
    'uno', 'les', 'ni', 'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto',
    'mí', 'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él', 'tanto',
    'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual', 'poco', 'ella', 'estar',
    'estas', 'algunas', 'algo', 'nosotros', 'mi', 'mis', 'tú', 'te', 'ti', 'tu', 'tus',
    'ellas', 'nosotras', 'vosotros', 'vosotras', 'os', 'mío', 'mía', 'míos', 'mías',
    # Common verbs and words
    'vez', 'veces', 'ser', 'son', 'han', 'ha', 'según', 'usted', 'hijo', 'hijos', 'hija',
    'hijas', 'semana', 'sean', 'si', 'ninguna', 'ninguno', 'nou', 'puede', 'pueden',
    'hacer', 'debe', 'deben', 'tiene', 'tienen', 'está', 'están', 'sido', 'cada', 'toda',
    'todas', 'tras', 'además', 'dos', 'tres', 'sido', 'misma', 'mismo', 'bien', 'hacer',
    'fue', 'era', 'menos', 'más', 'mes', 'meses', 'año', 'años', 'día', 'días',
    'frecuencia', 'veces', 'versus', 'adulto', 'adultos', 'niño', 'niños', 'relaciones',
    'relación', 'insoportable', 'marital', 'pareja', 'parejas', 'esposo', 'esposa',
    # Generic medical/document terms that aren't distinctive
    'familia', 'familiar', 'familiares', 'medicina', 'médico', 'paciente', 'tratamiento',
    'personas', 'persona', 'caso', 'casos', 'vida', 'edad', 'edades',
    # OCR and formatting artifacts
    'image', 'images', 'page', 'pages', 'header', 'headers', 'bold', 'size', 'pt', 'font',
    'descargado', 'lomoarcpsd', 'studocu',
]

# Global BERTopic model instance
_bertopic_model = None
_embedding_model = None


def identify_topics_semantic(
    text: str,
    n_clusters: int = None,
    max_clusters: int = 10,
    min_segment_length: int = 100
) -> Dict:
    """
    Identify topics from text using BERTopic.

    Args:
        text: Full OCR text with page markers
              Format: "--- Page X ---" with optional "### [HEADER, SIZE=Xpt]" markers
        n_clusters: Ignored (BERTopic auto-determines optimal number)
        max_clusters: Maximum number of clusters (default: 10)
        min_segment_length: Minimum character length for segments (default: 100)

    Returns:
        Dict with format: {"topics": [{"name": "...", "start": 1, "end": 5}, ...]}
    """
    print("[semantic_topic_identifier] Starting BERTopic-based topic identification...")
    print(f"  - Config: max_clusters={max_clusters}, min_segment_length={min_segment_length}")

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

    # Step 2: Extract segment texts
    segment_texts = [seg["text"] for seg in segments]
    print(f"[semantic_topic_identifier] Processing {len(segment_texts)} segments...")

    # Step 3: Get or create BERTopic model
    topic_model = _get_bertopic_model(len(segments), max_clusters)

    # Step 4: Fit BERTopic and get topic assignments
    try:
        topics_per_segment, probabilities = topic_model.fit_transform(segment_texts)

        # Get topic info
        topic_info = topic_model.get_topic_info()
        print(f"[semantic_topic_identifier] BERTopic found {len(topic_info) - 1} topics (excluding outliers)")

    except Exception as e:
        print(f"[semantic_topic_identifier] BERTopic failed: {e}")
        return {"topics": []}

    # Step 5: Convert BERTopic results to our format
    topics = _convert_bertopic_to_topics(
        segments,
        topics_per_segment,
        topic_model
    )

    print(f"[semantic_topic_identifier] Identified {len(topics)} topics")

    # Print topics for visibility
    for topic in topics:
        print(f"  - {topic['name']} (pages {topic['start']}-{topic['end']})")

    return {"topics": topics}


def _get_bertopic_model(n_segments: int, max_clusters: int):
    """
    Get or create a BERTopic model configured for our use case.

    Args:
        n_segments: Number of segments in document
        max_clusters: Maximum number of topics to identify

    Returns:
        Configured BERTopic model
    """
    global _embedding_model

    # Load embedding model if not already loaded
    if _embedding_model is None:
        print("[bertopic] Loading multilingual embedding model...")
        _embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        print("[bertopic] Embedding model loaded")

    # Configure CountVectorizer with Spanish stop words
    # This is used for c-TF-IDF topic representation
    vectorizer_model = CountVectorizer(
        stop_words=SPANISH_STOP_WORDS,
        ngram_range=(1, 3),  # Unigrams to trigrams
        min_df=1,  # Minimum document frequency
        token_pattern=r'(?u)\b[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]{4,}\b'  # Min 4 chars, Spanish chars
    )

    # Determine min_topic_size based on document length
    # Smaller docs need smaller min sizes
    if n_segments < 10:
        min_topic_size = 2
    elif n_segments < 30:
        min_topic_size = 3
    else:
        min_topic_size = max(3, n_segments // 15)  # Roughly 15 segments per topic

    print(f"[bertopic] Configuring BERTopic with min_topic_size={min_topic_size}")

    # Create BERTopic model
    # We don't cache this globally because different documents may need different configs
    topic_model = BERTopic(
        embedding_model=_embedding_model,
        vectorizer_model=vectorizer_model,
        min_topic_size=min_topic_size,
        nr_topics=max_clusters,  # Maximum number of topics (will reduce to this if needed)
        calculate_probabilities=True,
        verbose=False
    )

    return topic_model


def _convert_bertopic_to_topics(
    segments: List[Dict],
    topic_assignments: List[int],
    topic_model: BERTopic
) -> List[Dict]:
    """
    Convert BERTopic output to our topic format with page ranges.

    Args:
        segments: Original segment list
        topic_assignments: Topic ID for each segment (-1 = outlier)
        topic_model: Fitted BERTopic model

    Returns:
        List of topic dicts: [{"name": "...", "start": 1, "end": 5}, ...]
    """
    # Group segments by topic
    topics_dict = {}

    for segment, topic_id in zip(segments, topic_assignments):
        # Skip outliers (topic -1)
        if topic_id == -1:
            continue

        if topic_id not in topics_dict:
            topics_dict[topic_id] = []

        topics_dict[topic_id].append(segment)

    # Convert to our format
    topics = []

    for topic_id, topic_segments in topics_dict.items():
        # Get topic name from BERTopic
        topic_name = _get_topic_name(topic_id, topic_model, topic_segments)

        # Calculate page range
        pages = [seg["page"] for seg in topic_segments]
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


def _get_topic_name(topic_id: int, topic_model: BERTopic, segments: List[Dict]) -> str:
    """
    Get a meaningful name for a topic.

    Strategy:
    1. Check if any segment has a header marker - use that (most reliable)
    2. Otherwise use BERTopic's top words for the topic
    3. Fall back to generic name

    Args:
        topic_id: BERTopic topic ID
        topic_model: Fitted BERTopic model
        segments: Segments in this topic

    Returns:
        Topic name string
    """
    # Strategy 1: Look for header markers in segments
    for seg in segments:
        text = seg.get("text", "")

        # Find header with size information
        header_match = re.search(
            r'### \[HEADER, SIZE=([\d.]+)pt\](?:\s*\[BOLD\])?\s*(.+)',
            text,
            re.MULTILINE
        )

        if header_match:
            size = float(header_match.group(1))
            content = header_match.group(2).strip()

            # Only use reasonably sized headers (12pt+)
            if size >= 12.0 and len(content) >= 3:
                # Clean the header
                cleaned = re.sub(r'[^\w\s-]', '', content)
                cleaned = ' '.join(cleaned.split())

                if cleaned and len(cleaned) >= 3:
                    # Skip generic headers
                    generic_headers = {
                        'compendio', 'índice', 'indice', 'index', 'tabla de contenido',
                        'contenido', 'portada', 'título', 'titulo', 'introducción',
                        'apéndice', 'anexo', 'bibliografía', 'referencias', 'conclusión'
                    }

                    if cleaned.lower() not in generic_headers:
                        # Truncate if too long
                        if len(cleaned) > 60:
                            cleaned = cleaned[:57] + "..."
                        return cleaned[0].upper() + cleaned[1:]

    # Strategy 2: Use BERTopic's top words
    try:
        topic_words = topic_model.get_topic(topic_id)

        if topic_words:
            # Get top 3 words (BERTopic returns list of (word, score) tuples)
            top_words = [word for word, score in topic_words[:3]]

            # Clean and capitalize
            cleaned_words = []
            for word in top_words:
                cleaned = re.sub(r'[^\w\s-]', '', word)
                cleaned = ' '.join(cleaned.split())
                if cleaned and len(cleaned) >= 4:  # Min 4 chars
                    cleaned_words.append(cleaned[0].upper() + cleaned[1:])

            if cleaned_words:
                return " / ".join(cleaned_words)

    except Exception as e:
        print(f"[bertopic] Failed to get topic words for topic {topic_id}: {e}")

    # Strategy 3: Fallback to generic name
    return f"Topic {topic_id + 1}"
