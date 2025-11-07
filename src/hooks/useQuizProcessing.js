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

  // Separate function for polling and fetching results
  const pollAndFetchResults = async (s3Key, uploadedFile) => {
    // Use shorter intervals in dev mode for faster testing
    const isDev = import.meta.env.DEV;
    const pollingConfig = isDev ? {
      intervalMs: 500,        // 0.5 seconds in dev (vs 2 seconds in prod)
      timeoutMs: 60000,       // 1 minute in dev (vs 5 minutes in prod)
      maxWaitForRecord: 10000 // 10 seconds in dev (vs 1 minute in prod)
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

    // Fetch domains (topics) from resource_session_domains table
    const { data: domainsData, error: domainsError } = await fetchResourceSessionDomains(completedSession.id);

    // Use domains from the table, or fallback to JSONB topics for backward compatibility
    const topicsData = domainsData && domainsData.length > 0
      ? domainsData.map(d => ({
          id: d.id,
          name: d.name,
          start: d.page_range_start,
          end: d.page_range_end
        }))
      : (completedSession.topic_page_range?.topics || []);

    setTopics(topicsData);

    // Fetch questions for this resource session
    const { data: questionsData, error: questionsError, total, sampleCount } = await fetchResourceSessionQuestions(completedSession.id);

    const questions = questionsData || [];
    setQuestions(questions);
    setQuestionsCount(sampleCount || questions.length);
    setTotalQuestionsGenerated(total || 0);

    setIsProcessing(false);
    setCurrentProcessingState("");

    trackEvent('quiz_generated', {
      props: {
        fileType: uploadedFile?.type,
        topicsCount: topicsData.length,
        questionsCount: questions.length,
        sessionId: completedSession.id
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

      // Create resource repository first (Step 1: on file upload)
      const repositoryId = await createResourceRepository();
      setResourceRepositoryId(repositoryId);

      trackEvent('repository_created', {
        props: {
          repositoryId: repositoryId
        }
      });

      // Upload file to S3 using presigned URL, passing repository ID
      // S3 key is unique per upload (includes UUID)
      const { key, jobId, error: uploadError } = await uploadFileToS3(uploadedFile, repositoryId);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      setS3Key(key);

      trackEvent('file_uploaded', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name,
          s3Key: key,
          jobId: jobId,
          repositoryId: repositoryId
        }
      });

      // S3 upload triggers event -> SQS -> ECS backend processing
      // Backend will create resource_session record with repository_id
      // We poll by S3 key (which is unique per upload)
      await pollAndFetchResults(key, uploadedFile);

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
    handleProcessClick,
    handleRetry,
    resetProcessing
  };
}
