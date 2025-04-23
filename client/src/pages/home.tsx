import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { AudioGrid } from "@/components/ui/audio-grid";
import { AudioPlayer } from "@/components/ui/audio-player-fixed";
import { AudioTrackWithDetails, CategoryWithCount } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch all audio tracks
  const { 
    data: tracks, 
    isLoading: isTracksLoading 
  } = useQuery<AudioTrackWithDetails[]>({
    queryKey: ["/api/tracks"],
  });
  
  // Fetch all categories for the category header
  const {
    data: categories,
    isLoading: isCategoriesLoading,
  } = useQuery<CategoryWithCount[]>({
    queryKey: ["/api/categories"],
  });
  
  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  
  // Filter tracks based on search query
  const filteredTracks = searchQuery && tracks
    ? tracks.filter(track => 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.tags.some(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : tracks;
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header onSearch={handleSearch} />
      
      <div className="flex-grow flex overflow-hidden">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:block w-64 border-r border-border bg-background overflow-y-auto transition-colors duration-300">
          <Sidebar />
        </aside>
        
        {/* Main content */}
        <main className="flex-grow overflow-y-auto pb-20 bg-background transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Current category header */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                All Recordings
              </h2>
              <p className="text-muted-foreground text-sm">
                Browse our complete library of hypnosis audio tracks.
              </p>
            </div>
            
            {/* Audio grid */}
            <AudioGrid 
              tracks={filteredTracks || []} 
              isLoading={isTracksLoading} 
              emptyMessage={
                searchQuery 
                  ? `No tracks found matching "${searchQuery}"`
                  : "No audio tracks available"
              }
            />
          </div>
        </main>
      </div>
      
      {/* Audio player */}
      <AudioPlayer />
    </div>
  );
}
