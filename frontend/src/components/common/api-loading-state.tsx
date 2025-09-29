import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiLoadingStateProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function ApiLoadingState({ 
  rows = 3, 
  columns = 1, 
  showHeader = true,
  className = ""
}: ApiLoadingStateProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}
      
      <div className={`grid gap-4 ${columns === 1 ? 'grid-cols-1' : `grid-cols-1 md:grid-cols-${Math.min(columns, 3)}`}`}>
        {Array.from({ length: rows }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface TableLoadingStateProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableLoadingState({ 
  rows = 5, 
  columns = 4,
  className = ""
}: TableLoadingStateProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Table Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
      
      {/* Table Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={rowIndex} 
            className="grid gap-4" 
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface GridLoadingStateProps {
  items?: number;
  columns?: number;
  className?: string;
}

export function GridLoadingState({ 
  items = 6, 
  columns = 3,
  className = ""
}: GridLoadingStateProps) {
  return (
    <div className={`grid gap-6 ${className}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(300px, 1fr))` }}>
      {Array.from({ length: items }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}