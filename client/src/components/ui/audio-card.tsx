import React from "react";
import { AudioTrackWithDetails } from "@shared/schema";
import { useAudioContext } from "@/lib/audio-context";
import { formatTime } from "@/lib/format-time";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioCardProps {
  track: AudioTrackWithDetails;
}

export function AudioCard({ track }: AudioCardProps) {
  const { 
    currentTrack, 
    isPlaying, 
    playTrack, 
    pauseTrack, 
    resumeTrack,
    addToQueue 
  } = useAudioContext();
  
  const isCurrentTrack = currentTrack?.id === track.id;
  
  // Calculate progress percentage
  const progressPercent = track.progress 
    ? Math.min((track.progress.progress / track.duration) * 100, 100) 
    : 0;
  
  // Format time values
  const currentTime = track.progress ? formatTime(track.progress.progress) : "0:00";
  const totalTime = formatTime(track.duration);
  
  const handlePlayClick = () => {
    if (isCurrentTrack) {
      if (isPlaying) {
        pauseTrack();
      } else {
        resumeTrack();
      }
    } else {
      playTrack(track);
    }
  };
  
  const handleAddToQueue = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToQueue(track);
  };
  
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer" onClick={handlePlayClick}>
      <div className="relative">
        <div className="aspect-video bg-muted">
          <img 
            src={track.imageUrl} 
            alt={track.title} 
            className="object-cover w-full h-48"
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">{track.category.name}</span>
            <span className="text-white text-sm">{totalTime}</span>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-foreground">{track.title}</h3>
            <p className="text-sm text-muted-foreground">{track.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAddToQueue}
              className="flex-shrink-0 text-muted-foreground hover:text-primary"
              aria-label="Add to queue"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-primary hover:text-primary/80"
              aria-label={isCurrentTrack && isPlaying ? "Pause" : "Play"}
              onClick={handlePlayClick}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-8 w-8" />
              ) : (
                <Play className="h-8 w-8" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
            {track.category.name}
          </span>
          {track.tags.map((tag) => (
            <span 
              key={tag.id} 
              className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div>
          <div className="h-1 bg-muted rounded-sm overflow-hidden">
            <div 
              className={cn(
                "h-full bg-primary rounded-sm",
                progressPercent > 0 ? "" : "w-0"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">{currentTime}</span>
            <span className="text-xs text-muted-foreground">{totalTime}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
