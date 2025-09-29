import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ApiErrorBoundaryProps {
  error: string | null;
  onRetry?: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  className?: string;
}

export function ApiErrorBoundary({
  error,
  onRetry,
  title = "Error Loading Data",
  description,
  showRetry = true,
  className = ""
}: ApiErrorBoundaryProps) {
  if (!error) return null;

  return (
    <Card className={`max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
        </div>
        <CardTitle className="text-red-900">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-gray-600 mb-4">
          {description || error}
        </p>
        {showRetry && onRetry && (
          <Button onClick={onRetry} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ApiErrorStateProps {
  error: string | null;
  onRetry?: () => void;
  fullHeight?: boolean;
}

export function ApiErrorState({ error, onRetry, fullHeight = true }: ApiErrorStateProps) {
  if (!error) return null;

  const containerClass = fullHeight 
    ? "min-h-[400px] flex items-center justify-center" 
    : "py-12 flex items-center justify-center";

  return (
    <div className={containerClass}>
      <ApiErrorBoundary 
        error={error} 
        onRetry={onRetry}
        className="w-full max-w-md"
      />
    </div>
  );
}