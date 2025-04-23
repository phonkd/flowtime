import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Volume2, Play, Pause } from "lucide-react";
import { useAudioContext } from "@/lib/audio-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { formatTime } from "@/lib/format-time";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function SharedTrackPage() {
  const { linkId } = useParams();
  const { currentTrack, isPlaying, pauseTrack, resumeTrack, playTrack } = useAudioContext();
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  
  // Query the shared track API endpoint
  const {
    data: track,
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/shared/${linkId}`],
    retry: false // Don't retry if 404 or other error
  });
  
  // Effect to update progress bar
  useEffect(() => {
    if (!currentTrack || currentTrack.id !== track?.id) return;
    
    const interval = setInterval(() => {
      const audio = document.getElementById("audio-player") as HTMLAudioElement;
      if (audio && !isNaN(audio.duration)) {
        const percent = (audio.currentTime / audio.duration) * 100;
        setProgress(percent);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentTrack, track]);
  
  // Set the track when data is loaded
  useEffect(() => {
    if (track && (!currentTrack || currentTrack.id !== track.id)) {
      playTrack(track);
    }
  }, [track, currentTrack, playTrack]);
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    const audio = document.getElementById("audio-player") as HTMLAudioElement;
    if (audio) {
      audio.volume = newVolume / 100;
    }
  };
  
  // Handle play/pause
  const handlePlayPause = () => {
    if (currentTrack && currentTrack.id === track?.id) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else if (track) {
      playTrack(track);
    }
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    const seekPosition = value[0];
    const audio = document.getElementById("audio-player") as HTMLAudioElement;
    if (audio && !isNaN(audio.duration)) {
      const timeToSeek = (seekPosition / 100) * audio.duration;
      // Since we don't have direct seekTo, manually set the audio element's currentTime
      if (audio) {
        audio.currentTime = timeToSeek;
      }
      setProgress(seekPosition);
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading shared content...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive" className="max-w-2xl mx-auto">
          <AlertTitle>Error Loading Content</AlertTitle>
          <AlertDescription>
            {(error as any)?.message || "This shared content is no longer available or has expired."}
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
                          value={[progress]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={handleSeek}
                          className="mb-1"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {currentTrack?.id === track.id
                              ? formatTime(
                                  (document.getElementById("audio-player") as HTMLAudioElement)?.currentTime || 0
                                )
                              : "0:00"}
                          </span>
                          <span>{formatTime(track.duration)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                      <Slider
                        value={[volume]}
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