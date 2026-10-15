/**
 * CivicSphere AI — Quiz & Assessment Service
 * Presentation MVP Step 07A
 *
 * Rules:
 * - Operates strictly against the authenticated tenant context and authenticated user.
 * - Adheres to Row Level Security (RLS) policies.
 * - Authoritative grading is executed SOLELY by backend PostgreSQL RPC: public.submit_quiz.
 * - Safe quiz delivery is executed SOLELY by backend PostgreSQL RPC: public.get_learner_quiz.
 * - Never calculates scores or determines pass/fail in frontend/TypeScript code.
 * - Never selects directly from public.questions for learners (to prevent leaking is_correct).
 * - Never accepts or sends client-supplied user_id.
 * - Never performs database DELETEs or direct table inserts/updates to quiz_submissions.
 * - Does not call complete_lesson from this service.
 */

import { getSupabaseClient } from '../lib/supabase';

export interface LearnerQuizOption {
  id: string;
  text: string;
}

export interface LearnerQuizQuestion {
  id: string;
  prompt: string;
  question_type: string;
  order_index: number;
  options: LearnerQuizOption[];
}

export interface LearnerQuiz {
  id: string;
  tenant_id: string;
  course_id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  passing_score: number;
  points_reward: number | null;
  questions: LearnerQuizQuestion[];
}

export interface FetchQuizIdForLessonResult {
  quizId: string | null;
  error: string | null;
}

export interface FetchLearnerQuizResult {
  quiz: LearnerQuiz | null;
  error: string | null;
}

export interface SubmitQuizQuestionResult {
  question_id: string;
  selected_option_id?: string;
  is_correct?: boolean;
  explanation?: string | null;
}

export interface QuizAnswerPayloadItem {
  question_id: string;
  selected_option_id: string;
}

export interface SubmitQuizEvaluation {
  score: number;
  passed: boolean;
  correct_count?: number;
  total_questions?: number;
  points_awarded?: number;
  details?: SubmitQuizQuestionResult[];
}

export interface SubmitQuizResult {
  evaluation: SubmitQuizEvaluation | null;
  score: number;
  passed: boolean;
  points_awarded: number;
  error: string | null;
}

/**
 * Fetches sanitized quiz and questions for a learner via authoritative RPC:
 * public.get_learner_quiz(p_quiz_id)
 *
 * The RPC sanitizes all questions, completely stripping out correct answer flags.
 */
export async function fetchLearnerQuiz(
  quizId: string
): Promise<FetchLearnerQuizResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { quiz: null, error: 'Supabase client is not initialized.' };
  }

  try {
    const { data, error } = await client.rpc('get_learner_quiz', {
      p_quiz_id: quizId,
    });

    if (error) {
      return { quiz: null, error: error.message };
    }

    if (!data) {
      return { quiz: null, error: 'Quiz not found or unauthorized.' };
    }

    // Normalize returned JSON object
    const record = Array.isArray(data) ? data[0] : data;
    return {
      quiz: record as LearnerQuiz,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { quiz: null, error: msg };
  }
}

/**
 * Submits learner answers for server-side evaluation via authoritative RPC:
 * public.submit_quiz(p_answers, p_quiz_id, p_tenant_id)
 *
 * Scoring, pass/fail determination, and submission recording are performed
 * 100% server-side in PostgreSQL.
 */
export async function submitQuiz(
  tenantId: string,
  quizId: string,
  answers: QuizAnswerPayloadItem[]
): Promise<SubmitQuizResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      evaluation: null,
      score: 0,
      passed: false,
      points_awarded: 0,
      error: 'Supabase client is not initialized.',
    };
  }

  // Fail safely before calling Supabase if quizId or tenantId is missing or blank
  if (!quizId || typeof quizId !== 'string' || !quizId.trim()) {
    return {
      evaluation: null,
      score: 0,
      passed: false,
      points_awarded: 0,
      error: 'Cannot submit quiz: A valid quiz ID is required.',
    };
  }

  if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
    return {
      evaluation: null,
      score: 0,
      passed: false,
      points_awarded: 0,
      error: 'Cannot submit quiz: A valid tenant ID is required.',
    };
  }

  try {
    const { data, error } = await client.rpc('submit_quiz', {
      p_tenant_id: tenantId,
      p_quiz_id: quizId,
      p_answers: answers,
    });

    if (error) {
      return {
        evaluation: null,
        score: 0,
        passed: false,
        points_awarded: 0,
        error: error.message,
      };
    }

    const record = Array.isArray(data) ? data[0] : data;
    const score = Number(record?.score ?? 0);
    const passed = Boolean(record?.passed ?? false);
    const pointsAwarded = Number(record?.points_awarded ?? 0);

    const evaluation: SubmitQuizEvaluation = {
      score,
      passed,
      correct_count: record?.correct_answers ?? record?.correct_count,
      total_questions: record?.total_questions,
      points_awarded: pointsAwarded,
      details: record?.details || record?.question_results,
    };

    return {
      evaluation,
      score,
      passed,
      points_awarded: pointsAwarded,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      evaluation: null,
      score: 0,
      passed: false,
      points_awarded: 0,
      error: msg,
    };
  }
}

/**
 * Resolves the quiz ID for a given lesson within the active tenant.
 * Queries strictly public.quizzes for 'id'.
 */
export async function fetchQuizIdForLesson(
  tenantId: string,
  lessonId: string
): Promise<FetchQuizIdForLessonResult> {
  const client = getSupabaseClient();
  if (!client) {
    return { quizId: null, error: 'Supabase client is not initialized.' };
  }

  try {
    const { data, error } = await client
      .from('quizzes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('lesson_id', lessonId)
      .maybeSingle();

    if (error) {
      return { quizId: null, error: error.message };
    }

    return {
      quizId: data?.id ? String(data.id) : null,
      error: null,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { quizId: null, error: msg };
  }
}
