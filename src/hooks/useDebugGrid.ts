import { useState } from 'react';

export function useDebugGrid(initialVisible = true) {
  const [showGrid, setShowGrid] = useState(initialVisible);
  
  const toggleGrid = () => setShowGrid(prev => !prev);
  
  return {
    showGrid,
    toggleGrid
  };
} 