import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { Sidebar } from "@/components/ui/sidebar";
import { Music, Menu, Search, Upload, User, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onSearch: (query: string) => void;
}

export function Header({ onSearch }: HeaderProps) {
  const [location, navigate] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Get user auth state
  const { data: user } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    refetchOnWindowFocus: false,
  });
  
  // Check if user is admin
  const isAdmin = user && user.role === 'admin';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
    if (location !== "/search") {
      navigate("/search");
    }
    setIsSearchOpen(false);
  };
  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };
  
  return (
    <header className="bg-white shadow-sm z-20 sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">
                <Sidebar isMobile onCategorySelect={closeSidebar} />
              </SheetContent>
            </Sheet>
            
            {/* Logo */}
            <Link href="/">
              <a className="text-xl font-semibold text-neutral-900 flex items-center">
                <img 
                  src="/assets/flowtime-logo.png" 
                  alt="Flowtime" 
                  className="h-10 mr-2" 
                />
                <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent font-bold">
                  Flowtime
                </span>
              </a>
            </Link>
          </div>
          
          {/* Desktop search bar */}
          <div className="hidden md:block flex-grow max-w-md mx-4">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search audio tracks..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                />
                <Search className="h-5 w-5 absolute left-3 top-2.5 text-neutral-500" />
              </div>
            </form>
          </div>
          
          {/* User actions */}
          <div className="flex items-center space-x-4">
            {/* Mobile search trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
            
            {/* Upload button */}
            <Link href="/upload">
              <Button variant="outline" className="hidden md:flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            </Link>
            
            {/* Admin link - only shown to admin users */}
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="hidden md:flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Admin</span>
                </Button>
              </Link>
            )}
            
            {/* Sign in/out button */}
            {user ? (
              <Button 
                className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/';
                }}
              >
                <User className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            ) : (
              <Link href="/login">
                <Button className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
        
        {/* Mobile search (visible when expanded) */}
        {isSearchOpen && (
          <div className="md:hidden mt-3">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search audio tracks..."
                  className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  autoFocus
                />
                <Search className="h-5 w-5 absolute left-3 top-2.5 text-neutral-500" />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
