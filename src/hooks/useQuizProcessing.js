import { useState } from "react";
import { usePostHog } from "@/components/PostHogProvider";
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
  const { trackEvent } = usePostHog();

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
          console.log('Status changed to:', status);
          setCurrentProcessingState(status);
        }
      }
    );

    console.log('Processing completed:', completedSession);

    // Fetch domains (topics) from resource_session_domains table
    const { data: domainsData, error: domainsError } = await fetchResourceSessionDomains(completedSession.id);

    if (domainsError) {
      console.error('Error fetching domains:', domainsError);
    }

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

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
    }

    const questions = questionsData || [];
    console.log('=== FETCHED DATA ===');
    console.log('Domains:', domainsData);
    console.log('Topics (transformed):', topicsData);
    console.log('Questions sample:', questions[0]);
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

      // Upload file to S3 using presigned URL
      // S3 key is unique per upload (includes UUID)
      const { key, jobId, error: uploadError } = await uploadFileToS3(uploadedFile);

      if (uploadError) {
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded to S3:', { key, jobId });
      setS3Key(key);

      trackEvent('file_uploaded', {
        props: {
          fileType: uploadedFile.type,
          fileName: uploadedFile.name,
          s3Key: key,
          jobId: jobId
        }
      });

      // S3 upload triggers event -> SQS -> ECS backend processing
      // Backend will create resource_session record automatically
      // We poll by S3 key (which is unique per upload)
      console.log('Polling for processing completion by S3 key:', key);

      await pollAndFetchResults(key, uploadedFile);

    } catch (error) {
      console.error('Processing error:', error);
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
      console.error('Retry error:', error);
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
    handleProcessClick,
    handleRetry,
    resetProcessing
  };
}
