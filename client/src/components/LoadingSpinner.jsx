import React from 'react';

const LoadingSpinner = ({ message = 'Loading data from MongoDB Atlas...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-xs font-semibold text-slate-600">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
