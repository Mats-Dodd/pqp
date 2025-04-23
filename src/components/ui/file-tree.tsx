import * as React from "react";
import { createContext, useContext, useState } from "react";

type TreeContextType = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  showIndicator?: boolean;
};

const TreeContext = createContext<TreeContextType | undefined>(undefined);

interface TreeProps {
  children: React.ReactNode;
  initialSelectedId?: string;
  indicator?: boolean;
  className?: string;
}

interface FolderProps {
  children: React.ReactNode;
  name: string;
  value?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

interface FileProps {
  children: React.ReactNode;
  value?: string;
  isSelectable?: boolean;
  isSelected?: boolean;
  className?: string;
}

export function Tree({
  children,
  initialSelectedId = null,
  indicator = true,
  className = "",
}: TreeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);

  return (
    <TreeContext.Provider value={{ selectedId, setSelectedId, showIndicator: indicator }}>
      <div className={`font-mono text-sm ${className}`}>{children}</div>
    </TreeContext.Provider>
  );
}

export function Folder({
  children,
  name,
  value,
  isSelectable = true,
  isSelected = false,
  defaultOpen = false,
  className = "",
}: FolderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const treeContext = useContext(TreeContext);

  if (!treeContext) {
    throw new Error("Folder must be used within a Tree component");
  }

  const { selectedId, setSelectedId, showIndicator } = treeContext;
  const isItemSelected = isSelected || (value && selectedId === value);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleSelect = () => {
    if (isSelectable && value) {
      setSelectedId(value);
    }
  };

  const FolderIcon = () => (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      height="16" 
      width="16" 
      xmlns="http://www.w3.org/2000/svg"
      className="min-w-4 mr-1"
    >
      <path 
        d="M2 6C2 4.89543 2.89543 4 4 4H9C9.26522 4 9.51957 4.10536 9.70711 4.29289L11.4142 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6ZM8.58579 6L4 6V18H20V8H11C10.7348 8 10.4804 7.89464 10.2929 7.70711L8.58579 6Z" 
        fill="currentColor"
      />
    </svg>
  );

  return (
    <div className="select-none">
      <div
        onClick={handleSelect}
        className={`flex items-center cursor-pointer px-2 py-0.5 rounded ${
          isItemSelected ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800"
        } ${className}`}
      >
        <span className="mr-1 text-xs cursor-pointer" onClick={toggleOpen}>
          {isOpen ? "▼" : "►"}
        </span>
        <FolderIcon />
        <span>{name}</span>
      </div>
      {isOpen && (
        <div className={`ml-4 ${showIndicator ? "pl-2 border-l border-gray-300 dark:border-gray-700" : ""}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function File({
  children,
  value,
  isSelectable = true,
  isSelected = false,
  className = "",
}: FileProps) {
  const treeContext = useContext(TreeContext);

  if (!treeContext) {
    throw new Error("File must be used within a Tree component");
  }

  const { selectedId, setSelectedId } = treeContext;
  const isItemSelected = isSelected || (value && selectedId === value);

  const handleSelect = () => {
    if (isSelectable && value) {
      setSelectedId(value);
    }
  };

  const FileIcon = () => (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      height="16" 
      width="16" 
      xmlns="http://www.w3.org/2000/svg"
      className="min-w-4 mr-1"
    >
      <path 
        d="M4 4C4 2.89543 4.89543 2 6 2H14C14.2652 2 14.5196 2.10536 14.7071 2.29289L19.7071 7.29289C19.8946 7.48043 20 7.73478 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4ZM17.5858 8L14 4.41421V8H17.5858ZM12 4L6 4V20H18V10H13C12.4477 10 12 9.55228 12 9V4ZM8 13C8 12.4477 8.44772 12 9 12H15C15.5523 12 16 12.4477 16 13C16 13.5523 15.5523 14 15 14H9C8.44772 14 8 13.5523 8 13ZM8 17C8 16.4477 8.44772 16 9 16H15C15.5523 16 16 16.4477 16 17C16 17.5523 15.5523 18 15 18H9C8.44772 18 8 17.5523 8 17Z" 
        fill="currentColor"
      />
    </svg>
  );

  return (
    <div
      onClick={handleSelect}
      className={`flex items-center cursor-pointer px-2 py-0.5 rounded ${
        isItemSelected ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-800"
      } ${className}`}
    >
      <div className="mr-1 text-xs invisible">►</div>
      <FileIcon />
      <span>{children}</span>
    </div>
  );
} 