import React from "react";
import { AudioTrackWithDetails } from "@shared/schema";
import { AudioCard } from "@/components/ui/audio-card";
import { Skeleton } from "@/components/ui/skeleton";

interface AudioGridProps {
  tracks: AudioTrackWithDetails[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function AudioGrid({ tracks, isLoading = false, emptyMessage = "No audio tracks found" }: AudioGridProps) {
  
  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg shadow-md overflow-hidden">
            <Skeleton className="w-full h-48" />
            <div className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-2 mb-4">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-1 w-full mb-1" />
              <div className="flex justify-between">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Empty state
  if (tracks.length === 0) {
    return (
      <div className="flex justify-center items-center py-12 px-4 border border-dashed rounded-lg border-border bg-accent/5 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  
  // Tracks grid
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {tracks.map((track) => (
        <AudioCard key={track.id} track={track} />
      ))}
    </div>
  );
}
