import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Award,
  RotateCcw,
  Send,
  BookOpen
} from 'lucide-react';
import {
  fetchLearnerQuiz,
  submitQuiz,
  LearnerQuiz,
  SubmitQuizResult
} from '../../services/quizService';
import { useLanguage } from '../../contexts/LanguageContext';

interface LessonQuizViewerProps {
  quizId: string;
  tenantId: string;
  onPass?: (result: SubmitQuizResult) => void;
  onBack: () => void;
}

export const LessonQuizViewer: React.FC<LessonQuizViewerProps> = ({
  quizId,
  tenantId,
  onPass,
  onBack
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState<boolean>(true);
  const [quiz, setQuiz] = useState<LearnerQuiz | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Selected answers: map question_id -> option_id
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Submission state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<SubmitQuizResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      setLoading(true);
      setFetchError(null);
      setSubmissionResult(null);
      setAnswers({});

      const res = await fetchLearnerQuiz(quizId);
      if (!isMounted) return;

      if (res.error) {
        setFetchError(res.error);
        setQuiz(null);
      } else if (!res.quiz) {
        setFetchError('No quiz found for this lesson.');
        setQuiz(null);
      } else {
        setQuiz(res.quiz);
      }
      setLoading(false);
    }

    if (quizId) {
      loadQuiz();
    }

    return () => {
      isMounted = false;
    };
  }, [quizId]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (submitting || submissionResult) return;
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !quiz) return;

    // Verify all questions are answered
    const unanswered = quiz.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      setSubmitError(`Please answer all questions before submitting. (${unanswered.length} remaining)`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    // Ensure the valid quiz ID is passed
    const targetQuizId = quizId || quiz.id;
    if (!targetQuizId) {
      setSubmitError('Unable to submit: Quiz ID is missing.');
      setSubmitting(false);
      return;
    }

    const answerPayload = Object.entries(answers).map(
      ([question_id, selected_option_id]) => ({
        question_id,
        selected_option_id,
      })
    );

    const result = await submitQuiz(tenantId, targetQuizId, answerPayload);
    setSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setSubmissionResult(result);
      if (result.passed && onPass) {
        onPass(result);
      }
    }
  };

  const handleRetry = () => {
    setSubmissionResult(null);
    setSubmitError(null);
    setAnswers({});
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-700">Loading quiz assessment...</p>
          <p className="text-xs text-slate-400 mt-1">Fetching authorized quiz content</p>
        </div>
      </div>
    );
  }

  // 2. Error / Missing Quiz State
  if (fetchError || !quiz) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 mb-6">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <div>
            <h4 className="text-sm font-semibold">Quiz Unavailable</h4>
            <p className="text-xs mt-0.5">{fetchError || 'Unable to retrieve quiz details.'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Lesson</span>
        </button>
      </div>
    );
  }

  const questionsCount = quiz.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const isComplete = questionsCount > 0 && answeredCount === questionsCount;

  // Resolve passing score defensively from the quiz object
  const quizObj = quiz as unknown as Record<string, unknown>;
  const rawPassingScore = quizObj.passing_score ?? quizObj.passingScore;
  const passingScore = typeof rawPassingScore === 'number'
    ? rawPassingScore
    : typeof rawPassingScore === 'string' && !isNaN(Number(rawPassingScore))
      ? Number(rawPassingScore)
      : (quiz.passing_score ?? 67);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              title="Return to Lesson"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  {t('quiz.title')}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {t('quiz.passingScore')}: {passingScore}%
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 break-words">{quiz.title}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-600">
                {answeredCount} / {questionsCount} {t('quiz.answered')}
              </span>
              <div className="w-28 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${questionsCount ? (answeredCount / questionsCount) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {quiz.description && (
          <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
            {quiz.description}
          </p>
        )}
      </div>

      {/* Result Card (shown after submission) */}
      {submissionResult && (
        <div
          className={`rounded-xl border p-6 shadow-sm ${
            submissionResult.passed
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-rose-50 border-rose-200 text-rose-950'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl flex-shrink-0 ${
                submissionResult.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {submissionResult.passed ? (
                <CheckCircle2 className="w-8 h-8" />
              ) : (
                <XCircle className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-bold">
                  {submissionResult.passed ? t('quiz.assessmentPassed') : t('quiz.assessmentFailed')}
                </h3>
                <span
                  className={`text-sm font-bold font-mono px-3 py-1 rounded-full ${
                    submissionResult.passed
                      ? 'bg-emerald-200/60 text-emerald-900 border border-emerald-300'
                      : 'bg-rose-200/60 text-rose-900 border border-rose-300'
                  }`}
                >
                  Score: {submissionResult.score}%
                </span>
              </div>

              <p className="text-sm mt-2 leading-relaxed opacity-90">
                {submissionResult.passed
                  ? `Congratulations! You scored ${submissionResult.score}%, exceeding the required passing score of ${passingScore}%. Your lesson completion is being recorded.`
                  : `You scored ${submissionResult.score}%. The required passing score is ${passingScore}%. Review the lesson content and try again.`}
              </p>

              {submissionResult.points_awarded > 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>+{submissionResult.points_awarded} Points earned for passing this quiz</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{t('quiz.returnToLesson')}</span>
                </button>
                {!submissionResult.passed && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('quiz.tryAgain')}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Questions Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {questionsCount === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium">No questions currently authored for this quiz.</p>
          </div>
        ) : (
          quiz.questions.map((question, qIdx) => {
            const selectedOption = answers[question.id];

            return (
              <div
                key={question.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 mt-0.5">
                    {qIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 leading-snug break-words">
                      {question.prompt}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pt-1 pl-0 sm:pl-10">
                  {question.options?.map((option) => {
                    const isSelected = selectedOption === option.id;
                    const isDisabled = submitting || Boolean(submissionResult);

                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-medium ring-1 ring-blue-500/20'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/50'
                        } ${isDisabled ? 'cursor-not-allowed opacity-80' : ''}`}
                      >
                        <input
                          type="radio"
                          name={`question_${question.id}`}
                          value={option.id}
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => handleSelectOption(question.id, option.id)}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="flex-1 select-none">{option.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}

        {/* Submit Error Message */}
        {submitError && (
          <div className="flex items-center gap-2.5 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Action Bar */}
        {!submissionResult && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Cancel & Back</span>
            </button>

            <button
              type="submit"
              disabled={submitting || !isComplete}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg text-white shadow-sm transition-all ${
                submitting || !isComplete
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Grading Assessment...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Assessment ({answeredCount}/{questionsCount})</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
