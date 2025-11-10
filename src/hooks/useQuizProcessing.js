import { useState } from "react";
import { usePostHog } from "@/components/PostHogProvider";
import { supabase } from "@/lib/supabase";
import {
  uploadFileToS3,
  pollResourceSessionStatus,
  fetchResourceSessionDomains,
  fetchResourceSessionQuestions
} from "@/services/resourceSessionService";

export function useQuizProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingState, setCurrentProcessingState] = useState("");
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [totalQuestionsGenerated, setTotalQuestionsGenerated] = useState(0);
  const [s3Key, setS3Key] = useState(null);
  const [processingError, setProcessingError] = useState(null);
  const [resourceRepositoryId, setResourceRepositoryId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const { trackEvent } = usePostHog();

  // Create a new resource repository
  const createResourceRepository = async () => {
    const { data, error } = await supabase
      .from('resource_repositories')
      .insert({})
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create resource repository: ${error.message}`);
    }

    return data.id;
  };

  // Fetch all data from repository (all sessions, domains, questions)
  const fetchRepositoryData = async (repositoryId) => {
    // Fetch all sessions in this repository
    const { data: sessionsData } = await supabase
      .from('resource_sessions')
      .select('*')
      .eq('resource_repository_id', repositoryId)
      .order('created_at', { ascending: false });

    // Fetch all domains across all sessions in this repository
    const { data: domainsData } = await supabase
      .from('resource_session_domains')
      .select('*')
      .eq('resource_repository_id', repositoryId)
      .order('page_range_start', { ascending: true });

    // Fetch all questions across all sessions in this repository
    const { data: questionsData } = await supabase
      .from('resource_session_questions')
      .select('*')
      .eq('resource_repository_id', repositoryId)
      .eq('is_sample', false)
      .order('created_at', { ascending: true});

    // Get total count of all questions in repository
    const { count } = await supabase
      .from('resource_session_questions')
      .select('*', { count: 'exact', head: true })
      .eq('resource_repository_id', repositoryId);

    return {
      sessions: sessionsData || [],
      domains: domainsData || [],
      questions: questionsData || [],
      total: count || 0,
      sampleCount: questionsData?.length || 0
    };
  };

  // Separate function for polling and fetching results
  const pollAndFetchResults = async (s3Key, uploadedFile, repositoryId) => {
    // Use shorter intervals in dev mode for faster testing
    const isDev = import.meta.env.DEV;
    const pollingConfig = isDev ? {
      intervalMs: 1000,        // 1 second in dev for more granular updates (vs 2 seconds in prod)
      timeoutMs: 300000,       // 5 minutes timeout
      maxWaitForRecord: 60000 // 60 seconds to wait for initial record creation
    } : {
      intervalMs: 2000,
      timeoutMs: 300000,
      maxWaitForRecord: 60000
    };

    // Poll for completion using S3 key
    const completedSession = await pollResourceSessionStatus(
      { filePath: s3Key },
      {
        ...pollingConfig,
        onStatusChange: (status, sessionData) => {
          setCurrentProcessingState(status);
        }
      }
    );

    // Fetch all data from the repository (all sessions, domains, questions)
    const repositoryData = await fetchRepositoryData(repositoryId);

    setSessions(repositoryData.sessions);
    setTopics(repositoryData.domains.map(d => ({
      id: d.id,
      name: d.name,
      start: d.page_range_start,
      end: d.page_range_end
    })));
    setQuestions(repositoryData.questions);
    setQuestionsCount(repositoryData.sampleCount);
    setTotalQuestionsGenerated(repositoryData.total);

    setIsProcessing(false);
    setCurrentProcessingState("");

    trackEvent('quiz_generated', {
      props: {
        fileType: uploadedFile?.type,
        topicsCount: repositoryData.domains.length,
        questionsCount: repositoryData.questions.length,
        sessionsCount: repositoryData.sessions.length,
        sessionId: completedSession.id,
        repositoryId: repositoryId
      }
    });

    return { success: true };
  };

  const handleProcessClick = async (uploadedFile) => {
    if (!uploadedFile) return;

    setIsProcessing(true);
    setProcessingError(null);
    setCurrentProcessingState("uploading");

    try {
      trackEvent('processing_started', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name
        }
      });

      // Create resource repository if not exists, otherwise reuse existing
      let repositoryId = resourceRepositoryId;
      if (!repositoryId) {
        repositoryId = await createResourceRepository();
        setResourceRepositoryId(repositoryId);

        trackEvent('repository_created', {
          props: {
            repositoryId: repositoryId
          }
        });
      }

      // Upload file to S3 using presigned URL, passing repository ID
      // S3 key is unique per upload (includes UUID)
      const { key, jobId, error: uploadError } = await uploadFileToS3(uploadedFile, repositoryId);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      setS3Key(key);

      // DEV MODE: Print S3 upload confirmation
      if (import.meta.env.DEV) {
        console.log('%c📦 LocalStack Dev Mode', 'background: #667eea; color: white; padding: 8px; font-weight: bold; font-size: 14px;');
        console.log('%c✅ File uploaded to S3:', 'color: #059669; font-weight: bold;', key);
        console.log('%c⚡ S3 event notification will automatically trigger processing', 'color: #059669; font-size: 12px;');
        console.log('');
      }

      trackEvent('file_uploaded', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name,
          s3Key: key,
          jobId: jobId,
          repositoryId: repositoryId
        }
      });

      // S3 upload triggers event -> SQS -> ECS backend processing (or mock-server)
      // Backend will create resource_session record with repository_id
      // We poll by S3 key (which is unique per upload)
      await pollAndFetchResults(key, uploadedFile, repositoryId);

    } catch (error) {
      setProcessingError(error.message);
      setIsProcessing(false);
      setCurrentProcessingState("");
    }
  };

  const handleRetry = async () => {
    if (!s3Key) {
      alert('No file to retry. Please upload a file first.');
      return;
    }

    setIsProcessing(true);
    setProcessingError(null);
    setCurrentProcessingState("processing");

    try {
      trackEvent('processing_retried', {
        props: {
          s3Key: s3Key
        }
      });

      await pollAndFetchResults(s3Key, null);

    } catch (error) {
      setProcessingError(error.message);
      setIsProcessing(false);
      setCurrentProcessingState("");
    }
  };

  const resetProcessing = () => {
    setIsProcessing(false);
    setCurrentProcessingState("");
    setTopics([]);
    setQuestions([]);
    setQuestionsCount(0);
    setTotalQuestionsGenerated(0);
    setS3Key(null);
    setProcessingError(null);
    setResourceRepositoryId(null);
    setSessions([]);
  };

  return {
    isProcessing,
    currentProcessingState,
    topics,
    questions,
    questionsCount,
    totalQuestionsGenerated,
    s3Key,
    processingError,
    resourceRepositoryId,
    sessions,
    handleProcessClick,
    handleRetry,
    resetProcessing
  };
}
