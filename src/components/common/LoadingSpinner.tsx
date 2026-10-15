import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" role="status" aria-live="polite">
      <div
        className={`${sizeClasses[size]} border-slate-200 border-t-slate-800 rounded-full animate-spin`}
        aria-hidden="true"
      />
      {message && (
        <p className="mt-3 text-sm text-slate-500 font-medium">
          {message}
        </p>
      )}
      <span className="sr-only">{message}</span>
    </div>
  );
};
