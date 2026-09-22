import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorMessage = ({ message, onRetry }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md my-4 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 mt-0.5 text-red-500 shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-semibold">Error Loading Data</p>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
