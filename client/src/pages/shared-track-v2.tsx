import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Volume2, Play, Pause } from "lucide-react";
import { useAudioContext } from "@/lib/audio-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/format-time";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function SharedTrackPage() {
  const { linkId } = useParams();
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, playTrack } = useAudioContext();
  
  // State for the audio player
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [formattedCurrentTime, setFormattedCurrentTime] = useState("0:00");
  const [formattedDuration, setFormattedDuration] = useState("0:00");
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Query the shared track API endpoint
  const {
    data: track,
    isLoading: isTrackLoading,
    error: trackError
  } = useQuery({
    queryKey: [`/api/shared/${linkId}`],
    retry: false // Don't retry if 404 or other error
  });
  
  // Create audio element when track is loaded
  useEffect(() => {
    if (!track) return;
    
    // Clean up existing interval
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Create new audio element
    const audio = new Audio(track.audioUrl);
    audioRef.current = audio;
    
    // Set initial volume
    audio.volume = volume;
    
    // Event listeners
    const handleLoadedMetadata = () => {
      console.log("Audio metadata loaded");
      setDuration(audio.duration);
      setFormattedDuration(formatTime(audio.duration));
    };
    
    const handleEnded = () => {
      setPlaying(false);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };
    
    const handleError = (e: Event) => {
      console.error("Error playing audio:", e);
    };
    
    // Add event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Auto-play when track is loaded
    audio.play().then(() => {
      setPlaying(true);
      startProgressTracking();
      if (playTrack) playTrack(track);
    }).catch(err => {
      console.error("Error playing audio:", err);
    });
    
    // Cleanup
    return () => {
      if (audio) {
        audio.pause();
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
      }
      
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [track]);
  
  // Start tracking progress
  const startProgressTracking = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    
    intervalRef.current = window.setInterval(() => {
      if (audioRef.current) {
        const current = audioRef.current.currentTime;
        const duration = audioRef.current.duration;
        
        setCurrentTime(current);
        setFormattedCurrentTime(formatTime(current));
        setProgressPercent((current / duration) * 100);
      }
    }, 100);
  };
  
  // Stop tracking progress
  const stopProgressTracking = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // Toggle playback
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      stopProgressTracking();
      if (pauseTrack) pauseTrack();
    } else {
      audioRef.current.play().catch(console.error);
      setPlaying(true);
      startProgressTracking();
      if (resumeTrack) resumeTrack();
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };
  
  // Handle play/pause
  const handlePlayPause = () => {
    togglePlay();
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current || !duration) return;
    
    const newTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setFormattedCurrentTime(formatTime(newTime));
    setProgressPercent(value[0]);
  };
  
  if (isTrackLoading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading shared content...</p>
      </div>
    );
  }
  
  if (trackError) {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>
            {(trackError as any)?.message || "This shared content is no longer available or has expired."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!track) {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTitle>Content Not Found</AlertTitle>
          <AlertDescription>
            The shared content you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-3xl mx-auto">
        <Card className="shadow-lg border-t-4 border-t-primary">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/3">
                <div className="aspect-square relative rounded-md overflow-hidden border shadow">
                  <img 
                    src={track.imageUrl || track.category?.imageUrl || '/placeholder-image.jpg'} 
                    alt={track.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{track.title}</h1>
                <p className="text-muted-foreground mb-4">{track.category?.name}</p>
                <p className="mb-6">{track.description}</p>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={handlePlayPause}
                        className="h-12 w-12 rounded-full"
                      >
                        {isPlaying && currentTrack?.id === track.id ? (
                          <Pause className="h-6 w-6" />
                        ) : (
                          <Play className="h-6 w-6 ml-1" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <Slider
                          value={[progressPercent]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={handleSeek}
                          className="mb-1"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{formattedCurrentTime}</span>
                          <span>{formattedDuration}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <Slider
                        value={[volume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="w-32"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}