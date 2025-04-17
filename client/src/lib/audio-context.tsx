import React, { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { AudioTrackWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AudioContextType {
  currentTrack: AudioTrackWithDetails | null;
  isPlaying: boolean;
  queue: AudioTrackWithDetails[];
  playTrack: (track: AudioTrackWithDetails) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  addToQueue: (track: AudioTrackWithDetails) => void;
  removeFromQueue: (trackId: number) => void;
  clearQueue: () => void;
  updateProgress: (trackId: number, progress: number, completed: boolean) => Promise<void>;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const useAudioContext = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioContext must be used within an AudioProvider");
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioTrackWithDetails | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState<AudioTrackWithDetails[]>([]);
  const { toast } = useToast();

  const playTrack = useCallback((track: AudioTrackWithDetails) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  }, []);

  const pauseTrack = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const resumeTrack = useCallback(() => {
    if (currentTrack) {
      setIsPlaying(true);
    }
  }, [currentTrack]);

  const nextTrack = useCallback(() => {
    if (!queue.length) {
      toast({
        title: "End of queue",
        description: "There are no more tracks in the queue.",
        variant: "default",
      });
      return;
    }

    const nextTrack = queue[0];
    const updatedQueue = queue.slice(1);
    
    setCurrentTrack(nextTrack);
    setQueue(updatedQueue);
    setIsPlaying(true);
  }, [queue, toast]);

  const previousTrack = useCallback(() => {
    // This is a simple implementation, you might want to enhance it
    // to keep track of play history
    toast({
      title: "Not available",
      description: "Previous track functionality is not implemented yet.",
      variant: "default",
    });
  }, [toast]);

  const addToQueue = useCallback((track: AudioTrackWithDetails) => {
    setQueue((prevQueue) => [...prevQueue, track]);
    
    toast({
      title: "Added to queue",
      description: `"${track.title}" has been added to the queue.`,
      variant: "default",
    });
  }, [toast]);

  const removeFromQueue = useCallback((trackId: number) => {
    setQueue((prevQueue) => prevQueue.filter((track) => track.id !== trackId));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    
    toast({
      title: "Queue cleared",
      description: "All tracks have been removed from the queue.",
      variant: "default",
    });
  }, [toast]);

  const updateProgress = useCallback(async (trackId: number, progress: number, completed: boolean) => {
    try {
      await apiRequest("POST", "/api/progress", {
        audioTrackId: trackId,
        progress,
        completed,
      });
      
      // Invalidate cache for this track to refresh the progress
      queryClient.invalidateQueries({ queryKey: [`/api/tracks/${trackId}`] });
    } catch (error) {
      console.error("Failed to update progress:", error);
    }
  }, []);

  const value = {
    currentTrack,
    isPlaying,
    queue,
    playTrack,
    pauseTrack,
    resumeTrack,
    nextTrack,
    previousTrack,
    addToQueue,
    removeFromQueue,
    clearQueue,
    updateProgress,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};
