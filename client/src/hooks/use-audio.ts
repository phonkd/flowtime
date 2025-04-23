import { useState, useEffect, useRef } from 'react';
import { formatTime } from '@/lib/format-time';
import { apiRequest } from '@/lib/queryClient';

interface UseAudioProps {
  src: string;
  trackId: number;
  initialProgress?: number;
  onEnded?: () => void;
}

export const useAudio = ({ src, trackId, initialProgress = 0, onEnded }: UseAudioProps) => {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(initialProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [formattedCurrentTime, setFormattedCurrentTime] = useState(formatTime(initialProgress));
  const [formattedDuration, setFormattedDuration] = useState('00:00');
  const [progressPercent, setProgressPercent] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Setup audio element
  useEffect(() => {
    // Skip if no valid source is provided
    if (!src) {
      setLoading(false);
      return;
    }
    
    const audio = new Audio(src);
    audioRef.current = audio;
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setFormattedDuration(formatTime(audio.duration));
      setLoading(false);
      
      // Set initial progress if provided
      if (initialProgress > 0 && initialProgress < audio.duration) {
        audio.currentTime = initialProgress;
        setCurrentTime(initialProgress);
        setFormattedCurrentTime(formatTime(initialProgress));
        setProgressPercent((initialProgress / audio.duration) * 100);
      }
    };
    
    const handleError = () => {
      setError('Error loading audio file');
      setLoading(false);
    };
    
    const handleEnded = () => {
      setPlaying(false);
      if (onEnded) {
        onEnded();
      }
    };
    
    // Setup event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      // Cleanup event listeners
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      
      // Stop and clean up audio
      audio.pause();
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [src, initialProgress, onEnded]);
  
  // Update progress in the database every 5 seconds
  useEffect(() => {
    if (playing && currentTime > 0) {
      const saveProgressInterval = window.setInterval(() => {
        saveProgress();
      }, 5000);
      
      return () => {
        window.clearInterval(saveProgressInterval);
      };
    }
  }, [playing, currentTime, trackId]);
  
  // Handle play/pause
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (playing) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Start tracking progress
            if (intervalRef.current) {
              window.clearInterval(intervalRef.current);
            }
            
            intervalRef.current = window.setInterval(() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                setFormattedCurrentTime(formatTime(audioRef.current.currentTime));
                setProgressPercent((audioRef.current.currentTime / audioRef.current.duration) * 100);
              }
            }, 100);
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
            setPlaying(false);
          });
      }
    } else {
      audioRef.current.pause();
      
      // Stop tracking progress
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [playing]);
  
  // Handle volume change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  // Save progress to the server
  const saveProgress = async () => {
    // Skip if no valid audio reference or track ID is invalid
    if (!audioRef.current || trackId <= 0) return;
    
    try {
      await apiRequest('/api/progress', {
        method: 'POST',
        body: {
          audioTrackId: trackId,
          progress: Math.floor(audioRef.current.currentTime),
          completed: audioRef.current.currentTime >= audioRef.current.duration
        }
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      // Continue playing even if there's an error saving progress
    }
  };
  
  const togglePlay = () => {
    setPlaying(!playing);
  };
  
  const stop = () => {
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setFormattedCurrentTime(formatTime(0));
      setProgressPercent(0);
    }
  };
  
  const seekTo = (percent: number) => {
    if (!audioRef.current || !duration) return;
    
    const newTime = (percent / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setFormattedCurrentTime(formatTime(newTime));
    setProgressPercent(percent);
  };
  
  const setVolumeLevel = (level: number) => {
    if (level < 0) level = 0;
    if (level > 1) level = 1;
    setVolume(level);
  };
  
  return {
    playing,
    duration,
    currentTime,
    loading,
    error,
    volume,
    formattedCurrentTime,
    formattedDuration,
    progressPercent,
    togglePlay,
    stop,
    seekTo,
    setVolumeLevel
  };
};
