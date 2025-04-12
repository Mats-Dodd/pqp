import { useState, useRef } from 'react';

export interface UseResizableInputProps {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
}

export function useResizableInput({
  initialHeight = 4,
  minHeight = 1,
  maxHeight = 10
}: UseResizableInputProps = {}) {
  const [inputHeight, setInputHeight] = useState(initialHeight);
  const dragStartYRef = useRef(0);
  const startHeightRef = useRef(0);
  
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStartYRef.current = e.clientY;
    startHeightRef.current = inputHeight;
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  };
  
  const handleDragMove = (e: MouseEvent) => {
    const lineHeightPx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--line-height'));
    const deltaY = dragStartYRef.current - e.clientY;
    const deltaLines = Math.round(deltaY / lineHeightPx);
    
    const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeightRef.current + deltaLines));
    setInputHeight(newHeight);
  };
  
  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  };
  
  return {
    inputHeight,
    handleDragStart,
    setInputHeight
  };
} 