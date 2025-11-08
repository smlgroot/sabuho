"""
Question generation module - generates quiz questions from topics.
This module is designed to be testable independently.
"""
import time
from ai.openai_client import create_openai_client, call_openai_for_questions
from ai.text_processor import create_batches, format_batch_content


# Rate limiting configuration (OpenAI gpt-4o-mini limits)
RATE_LIMIT_REQUESTS_PER_MIN = 500
RATE_LIMIT_TOKENS_PER_MIN = 200000
DELAY_BETWEEN_BATCHES_SECONDS = 2  # Conservative delay to avoid rate limits


def generate_questions_for_topics(topic_texts: list, domain_mapping: dict, progress_callback) -> list:
    """
    Generate quiz questions for a list of topics.

    This is the main entry point for question generation.
    It can be tested independently without the full Lambda context.

    Args:
        topic_texts: List of topic dicts with 'name', 'text', 'start', 'end' keys
        domain_mapping: Dict mapping topic names to domain IDs
                       Example: {"Introduction": "uuid-1234", "Chapter 1": "uuid-5678"}
        progress_callback: Callback function(stage, current, total) to report progress

    Returns:
        List of question dicts with domain_id included:
        [
            {
                "question": "Question text",
                "options": ["A", "B", "C"],
                "correct_answer_index": 0,
                "source_text": "...",
                "topic_name": "Introduction",
                "domain_id": "uuid-1234"
            },
            ...
        ]

    Raises:
        Exception: If OpenAI client creation or API call fails

    Example:
        >>> topics = [{"name": "Intro", "text": "...", "start": 1, "end": 2}]
        >>> domains = {"Intro": "uuid-1234"}
        >>> questions = generate_questions_for_topics(topics, domains, callback)
    """
    print(f"Starting question generation for {len(topic_texts)} topics...")

    if not topic_texts:
        print("Warning: No topics provided for question generation")
        return []

    # Create OpenAI client
    client = create_openai_client()

    # Create batches based on token limits
    batches = create_batches(topic_texts)
    print(f"Created {len(batches)} batches for processing")

    # Calculate total topics for progress tracking
    total_topics = len(topic_texts)
    topics_processed = 0

    # Process each batch
    all_questions = []
    for batch_index, batch in enumerate(batches):
        # Calculate topic range for this batch
        topic_start = topics_processed + 1
        topic_end = topics_processed + len(batch)

        # Report progress BEFORE starting batch (show topic count, not batch count)
        # Use metadata to include topic range information
        topics_metadata = f"topics_{topic_start}_to_{topic_end}"
        progress_callback('ai_batch', topic_start, total_topics, topics_metadata)

        print(f"Processing batch {batch_index + 1}/{len(batches)} with {len(batch)} topics (topics {topic_start}-{topic_end}/{total_topics})...")

        # Format batch content
        batch_content = format_batch_content(batch)

        # Call OpenAI for this batch
        try:
            batch_questions = call_openai_for_questions(client, batch_content, batch)

            # Map questions to domains
            questions_with_domains = _map_questions_to_domains(
                batch_questions,
                batch,
                domain_mapping
            )

            all_questions.extend(questions_with_domains)

            print(f"Batch {batch_index + 1} generated {len(batch_questions)} questions")

        except Exception as e:
            print(f"Error processing batch {batch_index + 1}: {e}")
            # Continue with other batches even if one fails
            continue

        # Update topics processed counter
        topics_processed = topic_end

        # Rate limiting: wait between batches
        if batch_index < len(batches) - 1:  # Don't wait after last batch
            print(f"Waiting {DELAY_BETWEEN_BATCHES_SECONDS}s before next batch...")
            time.sleep(DELAY_BETWEEN_BATCHES_SECONDS)

    print(f"Question generation complete: {len(all_questions)} total questions generated")

    return all_questions


def _map_questions_to_domains(questions: list, batch_topics: list, domain_mapping: dict) -> list:
    """
    Map generated questions to their corresponding domain IDs.

    Strategy: Use heuristics to determine which topic each question belongs to.
    - Match keywords from topic names in question/options/source_text
    - Fall back to distributing questions evenly across batch topics

    Args:
        questions: List of question dicts from OpenAI
        batch_topics: List of topic dicts that were in this batch
        domain_mapping: Dict mapping topic names to domain IDs

    Returns:
        List of questions with 'topic_name' and 'domain_id' added
    """
    # Create a topic name -> topic dict mapping for easy lookup
    topic_lookup = {topic['name']: topic for topic in batch_topics}

    questions_with_domains = []

    for question in questions:
        # Try to determine which topic this question belongs to
        topic_name = _infer_topic_for_question(question, batch_topics)

        # Get domain ID for this topic
        domain_id = domain_mapping.get(topic_name)

        if not domain_id:
            print(f"Warning: No domain_id found for topic '{topic_name}', skipping question")
            continue

        # Add topic name and domain ID to question
        question_with_domain = {
            **question,
            'topic_name': topic_name,
            'domain_id': domain_id
        }

        questions_with_domains.append(question_with_domain)

    return questions_with_domains


def _infer_topic_for_question(question: dict, batch_topics: list) -> str:
    """
    Infer which topic a question belongs to based on content matching.

    Args:
        question: Question dict with 'question', 'options', 'source_text' keys
        batch_topics: List of topic dicts in this batch

    Returns:
        Topic name (defaults to first topic if no clear match)
    """
    # Combine all question content for matching
    question_content = (
        question.get('question', '') + ' ' +
        ' '.join(question.get('options', [])) + ' ' +
        question.get('source_text', '')
    ).lower()

    # Try to find best matching topic
    best_match = None
    best_match_score = 0

    for topic in batch_topics:
        topic_name = topic['name'].lower()
        topic_keywords = topic_name.split()

        # Count how many topic keywords appear in question content
        match_score = sum(1 for keyword in topic_keywords if keyword in question_content)

        if match_score > best_match_score:
            best_match_score = match_score
            best_match = topic['name']

    # If we found a match, use it; otherwise use first topic as fallback
    if best_match:
        return best_match
    else:
        # Fallback: use first topic in batch
        return batch_topics[0]['name'] if batch_topics else 'Unknown'


def validate_question(question: dict) -> bool:
    """
    Validate that a question has the required structure.

    Args:
        question: Question dict to validate

    Returns:
        True if valid, False otherwise
    """
    required_keys = ['question', 'options', 'correct_answer_index', 'domain_id']

    for key in required_keys:
        if key not in question:
            return False

    # Validate types
    if not isinstance(question['question'], str):
        return False
    if not isinstance(question['options'], list):
        return False
    if not isinstance(question['correct_answer_index'], int):
        return False
    if not isinstance(question['domain_id'], str):
        return False

    # Validate options
    if len(question['options']) < 2:
        return False

    # Validate correct answer index
    if question['correct_answer_index'] < 0 or question['correct_answer_index'] >= len(question['options']):
        return False

    return True
