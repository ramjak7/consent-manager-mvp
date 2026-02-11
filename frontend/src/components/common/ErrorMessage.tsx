interface ErrorMessageProps {
  error: Error | string;
  retry?: () => void;
  fullScreen?: boolean;
}

export function ErrorMessage({
  error,
  retry,
  fullScreen = false,
}: ErrorMessageProps) {
  const message = typeof error === 'string' ? error : error.message;

  const content = (
    <div className="bg-error-light border border-error rounded-lg p-6 max-w-md">
      <div className="flex items-start gap-3">
        <div className="text-2xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-error font-semibold mb-2">Error</h3>
          <p className="text-gray-700 text-sm mb-4">{message}</p>
          {retry && (
            <button onClick={retry} className="btn-primary">
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
        {content}
      </div>
    );
  }

  return content;
}
