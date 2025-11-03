import { v4 as uuidv4 } from 'uuid';

export interface MockTopic {
  name: string;
  start: number;
  end: number;
}

export interface MockQuestion {
  id: string;
  body: string;
  options: string[];
  created_at: string;
  resource_session_id: string;
  is_sample: boolean;
}

export interface MockResourceSession {
  id: string;
  name: string;
  file_path: string;
  url: null;
  mime_type: string;
  status: 'uploading' | 'processing' | 'decoding' | 'ocr_completed' | 'ai_processing' | 'completed' | 'failed';
  topic_page_range: {
    topics: MockTopic[];
  };
  created_at: string;
  updated_at: string;
}

// Generate 10 mock topics with realistic names and page ranges
export const generateMockTopics = (): MockTopic[] => {
  const topicNames = [
    'Introduction to Core Concepts',
    'Fundamental Principles',
    'Advanced Methodologies',
    'Practical Applications',
    'Case Studies and Examples',
    'Best Practices',
    'Common Challenges',
    'Implementation Strategies',
    'Future Trends',
    'Conclusion and Summary'
  ];

  return topicNames.map((name, index) => {
    const pagesPerTopic = 3 + Math.floor(Math.random() * 5); // 3-7 pages per topic
    const start = index === 0 ? 1 : topicNames.slice(0, index).reduce((acc, _, i) => acc + (3 + Math.floor(Math.random() * 5)), 1);

    return {
      name,
      start,
      end: start + pagesPerTopic - 1
    };
  });
};

// Generate 100 mock questions distributed across topics
export const generateMockQuestions = (sessionId: string, topics: MockTopic[]): MockQuestion[] => {
  const questions: MockQuestion[] = [];
  const questionsPerTopic = 10; // 100 questions / 10 topics = 10 per topic

  const questionTemplates = [
    'What is the primary focus of {topic}?',
    'Which of the following best describes {topic}?',
    'According to the material on {topic}, what is the key principle?',
    'How does {topic} relate to the overall framework?',
    'What is the main advantage of the approach discussed in {topic}?',
    'Which statement about {topic} is most accurate?',
    'In the context of {topic}, what does the term mean?',
    'What is the recommended strategy for {topic}?',
    'Which factor is most important in {topic}?',
    'What conclusion can be drawn from {topic}?'
  ];

  const optionTemplates = [
    ['A comprehensive approach', 'A limited perspective [correct]', 'An outdated method', 'A theoretical concept'],
    ['It provides clear guidance', 'It offers flexible solutions [correct]', 'It restricts implementation', 'It complicates the process'],
    ['Consistency and reliability', 'Adaptability and innovation [correct]', 'Simplicity over complexity', 'Speed over accuracy'],
    ['Through direct correlation [correct]', 'Through indirect association', 'Through minimal connection', 'Through opposing views'],
    ['Increased efficiency [correct]', 'Reduced complexity', 'Lower cost', 'Faster results'],
    ['It is fundamental to success [correct]', 'It is optional', 'It is outdated', 'It is controversial'],
    ['A core component [correct]', 'A supporting element', 'A minor detail', 'An external factor'],
    ['Systematic implementation [correct]', 'Random application', 'Minimal intervention', 'Delayed execution'],
    ['Clear objectives [correct]', 'Flexible timelines', 'Multiple alternatives', 'External validation'],
    ['It provides valuable insights [correct]', 'It raises more questions', 'It contradicts other findings', 'It has limited application']
  ];

  topics.forEach((topic, topicIndex) => {
    for (let i = 0; i < questionsPerTopic; i++) {
      const templateIndex = (topicIndex * questionsPerTopic + i) % questionTemplates.length;
      const questionBody = questionTemplates[templateIndex].replace('{topic}', topic.name);
      const options = optionTemplates[templateIndex % optionTemplates.length];

      questions.push({
        id: uuidv4(),
        body: questionBody,
        options: [...options],
        created_at: new Date().toISOString(),
        resource_session_id: sessionId,
        is_sample: true // Default all to sample (true)
      });
    }
  });

  // Mark only 25% of questions as is_sample=false (evenly distributed)
  // These are the ones that will be returned when filtering by is_sample=false
  const totalQuestions = questions.length;
  const returnSize = Math.floor(totalQuestions * 0.25); // 25% to return
  const interval = Math.floor(totalQuestions / returnSize);

  for (let i = 0; i < returnSize; i++) {
    const index = i * interval;
    if (index < totalQuestions) {
      questions[index].is_sample = false; // Only 25% have is_sample=false
    }
  }

  return questions;
};

// Generate a complete mock resource session
export const generateMockSession = (
  filename: string,
  filePath: string,
  mimeType: string,
  jobId: string
): {
  session: MockResourceSession;
  questions: MockQuestion[];
} => {
  const topics = generateMockTopics();
  const sessionId = jobId;

  const session: MockResourceSession = {
    id: sessionId,
    name: filename,
    file_path: filePath,
    url: null,
    mime_type: mimeType,
    status: 'processing',
    topic_page_range: {
      topics
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const questions = generateMockQuestions(sessionId, topics);

  return { session, questions };
};
