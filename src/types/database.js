// Database type definitions converted to JavaScript objects for reference

// Since JavaScript doesn't have static types, these are just documentation/reference objects
// You can use them for validation or default object structures if needed

export const DomainShape = {
  id: '',
  author_id: '',
  parent_id: null,
  name: '',
  description: null,
  created_at: '',
  updated_at: '',
  thumbnail_url: null,
  question_count: null
}

export const QuestionShape = {
  id: '',
  domain_id: '',
  body: '',
  explanation: null,
  created_at: '',
  updated_at: '',
  author_id: '',
  resource_id: null,
  options: null
}

export const TopicShape = {
  name: '',
  start: 0,
  end: 0
}

export const TopicsMapShape = {
  topics: []
}

export const ResourceShape = {
  id: '',
  domain_id: '',
  author_id: '',
  name: '',
  description: null,
  file_path: null,
  url: null,
  mime_type: null,
  status: 'processing', // 'processing' | 'completed' | 'failure'
  topic_page_range: null,
  unparsable: null,
  created_at: '',
  updated_at: ''
}

export const QuizShape = {
  id: '',
  author_id: '',
  name: '',
  description: null,
  domains: null,
  is_published: false,
  num_questions: 0,
  created_at: '',
  updated_at: ''
}

export const DomainWithChildrenShape = {
  ...DomainShape,
  children: [],
  resources: [],
  questions: []
}