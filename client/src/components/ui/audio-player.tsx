import React, { useRef, useState } from "react";
import { useAudioContext } from "@/lib/audio-context";
import { useAudio } from "@/hooks/use-audio";
import { formatTime } from "@/lib/format-time";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, SkipBack, SkipForward, Play, Pause, Repeat, Clock } from "lucide-react";

export function AudioPlayer() {
  const { 
    currentTrack, 
    isPlaying: contextIsPlaying,
    pauseTrack, 
    resumeTrack,
    nextTrack,
    previousTrack 
  } = useAudioContext();
  
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showPlaybackOptions, setShowPlaybackOptions] = useState(false);
  const [loop, setLoop] = useState(false);
  
  // Return null if no track is selected
  if (!currentTrack) {
    return null;
  }
  
  const initialProgress = currentTrack.progress?.progress || 0;
  
  const { 
    playing,
    formattedCurrentTime,
    formattedDuration,
    progressPercent,
    togglePlay,
    seekTo,
    volume,
    setVolumeLevel
  } = useAudio({
    src: currentTrack.audioUrl,
    trackId: currentTrack.id,
    initialProgress,
    onEnded: () => {
      if (loop) {
        // Restart the track if loop is enabled
        seekTo(0);
        togglePlay();
      } else {
        // Play next track if available
        nextTrack();
      }
    }
  });
  
  // Sync playing state with context
  React.useEffect(() => {
    if (playing !== contextIsPlaying) {
      togglePlay();
    }
  }, [contextIsPlaying]);
  
  // Toggle playback
  const handlePlayPause = () => {
    if (playing) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  };
  
  // Seek to position when user drags the progress bar
  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };
  
  // Handle volume change
  const handleVolumeChange = (value: number[]) => {
    setVolumeLevel(value[0] / 100);
  };
  
  // Toggle volume slider visibility
  const toggleVolumeSlider = () => {
    setShowVolumeSlider(!showVolumeSlider);
  };
  
  // Toggle playback speed options
  const togglePlaybackOptions = () => {
    setShowPlaybackOptions(!showPlaybackOptions);
  };
  
  // Update playback speed
  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    // Apply to audio element
    const audio = document.querySelector('audio');
    if (audio) {
      audio.playbackRate = rate;
    }
    setShowPlaybackOptions(false);
  };
  
  // Toggle loop mode
  const toggleLoop = () => {
    setLoop(!loop);
  };
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 shadow-lg z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Track progress */}
        <div className="h-1 bg-neutral-200 w-full mt-2 rounded-sm">
          <div 
            className="h-full bg-primary rounded-sm transition-all duration-100 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        
        <div className="py-3 grid grid-cols-12 gap-4 items-center">
          {/* Track info */}
          <div className="col-span-12 sm:col-span-3 flex items-center">
            <div className="w-12 h-12 bg-neutral-100 rounded overflow-hidden flex-shrink-0 mr-3">
              <img 
                src={currentTrack.imageUrl} 
                alt={currentTrack.title} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-neutral-900 truncate">
                {currentTrack.title}
              </h4>
              <p className="text-xs text-neutral-500 truncate">
                {currentTrack.category.name}
              </p>
            </div>
          </div>
          
          {/* Playback controls */}
          <div className="col-span-12 sm:col-span-6 flex justify-center items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousTrack}
              aria-label="Previous track"
              className="text-neutral-600 hover:text-primary"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={handlePlayPause}
              className="bg-primary hover:bg-primary/90 text-white rounded-full p-3 h-12 w-12 flex items-center justify-center"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextTrack}
              aria-label="Next track"
              className="text-neutral-600 hover:text-primary"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-xs text-neutral-600 whitespace-nowrap">
                {formattedCurrentTime}
              </span>
              <span className="text-xs text-neutral-600">/</span>
              <span className="text-xs text-neutral-600 whitespace-nowrap">
                {formattedDuration}
              </span>
            </div>
          </div>
          
          {/* Additional controls */}
          <div className="col-span-12 sm:col-span-3 flex justify-end items-center space-x-4">
            <div className="hidden sm:flex items-center relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVolumeSlider}
                aria-label="Adjust volume"
                className="text-neutral-600 hover:text-primary"
              >
                {volume > 0 ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>
              
              {showVolumeSlider && (
                <div className="absolute bottom-full mb-2 p-2 bg-white shadow-md rounded-md w-24">
                  <Slider
                    value={[volume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="h-1.5"
                  />
                </div>
              )}
            </div>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlaybackOptions}
                aria-label="Change playback speed"
                className="text-neutral-600 hover:text-primary"
              >
                <Clock className="h-5 w-5" />
              </Button>
              
              {showPlaybackOptions && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-white shadow-md rounded-md w-24">
                  <div className="flex flex-col space-y-1">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`text-xs px-2 py-1 rounded-sm text-left ${
                          playbackRate === rate
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100"
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLoop}
              aria-label="Loop track"
              className={`text-neutral-600 ${loop ? 'text-primary' : 'hover:text-primary'}`}
            >
              <Repeat className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
