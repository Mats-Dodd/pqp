import { useEffect, useState, useRef } from "react";
import { 
  getConversations, 
  getFolders, 
  getRootFolders,
  getChildFolders,
  getConversationsByFolder,
  createFolder,
  Conversation,
  Folder 
} from "@/lib/db";
import { Tree, Folder as TreeFolder, File } from "@/components/ui/file-tree";
import { sidebarEvents } from "@/App";

interface ConvoTreeProps {
  onSelectConversation?: (id: number) => void;
  onNewChat?: () => void;
  currentConversationId?: number;
}

export function ConvoTree({ 
  onSelectConversation,
  onNewChat,
  currentConversationId
}: ConvoTreeProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [rootFolders, setRootFolders] = useState<Folder[]>([]);
  const [unfiledConversations, setUnfiledConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      // Load all conversations and folders
      const [convos, allFolders, rootFoldersData, unfiledConvos] = await Promise.all([
        getConversations(),
        getFolders(),
        getRootFolders(),
        getConversationsByFolder(null)
      ]);
      
      setConversations(convos);
      setFolders(allFolders);
      setRootFolders(rootFoldersData);
      setUnfiledConversations(unfiledConvos);
    } catch (error) {
      console.error("Failed to load conversations and folders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // Listen for sidebar reload events
    const reloadListener = () => {
      loadData();
    };
    
    sidebarEvents.on('reload', reloadListener);
    
    // Clean up event listener
    return () => {
      sidebarEvents.off('reload', reloadListener);
    };
  }, []);

  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [showNewFolderInput]);

  const handleConversationClick = (id: number) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    }
  };

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      try {
        await createFolder(newFolderName.trim());
        setNewFolderName("");
        setShowNewFolderInput(false);
        // Reload data after creating a new folder
        loadData();
      } catch (error) {
        console.error("Failed to create folder:", error);
      }
    }
  };

  const NewFolderIcon = () => (
    <svg 
      fill="none" 
      viewBox="0 0 24 24" 
      height="16" 
      width="16" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M2 6C2 4.89543 2.89543 4 4 4H9C9.26522 4 9.51957 4.10536 9.70711 4.29289L11.4142 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6ZM8.58579 6L4 6V18H20V8H11C10.7348 8 10.4804 7.89464 10.2929 7.70711L8.58579 6ZM12 10C12.5523 10 13 10.4477 13 11V12H14C14.5523 12 15 12.4477 15 13C15 13.5523 14.5523 14 14 14H13V15C13 15.5523 12.5523 16 12 16C11.4477 16 11 15.5523 11 15V14H10C9.44772 14 9 13.5523 9 13C9 12.4477 9.44772 12 10 12H11V11C11 10.4477 11.4477 10 12 10Z" 
        fill="currentColor"
      />
    </svg>
  );

  // Recursive function to render folder hierarchy
  const renderFolderTree = (parentId: number | null = null) => {
    const foldersToRender = folders.filter(folder => folder.parent_id === parentId);
    
    return foldersToRender.map(folder => {
      const folderConversations = conversations.filter(convo => convo.folder_id === folder.id);
      const hasChildren = folders.some(f => f.parent_id === folder.id) || folderConversations.length > 0;
      
      return (
        <TreeFolder 
          key={`folder-${folder.id}`} 
          name={folder.name}
          value={`folder-${folder.id}`}
          defaultOpen={false}
          className="text-white hover:bg-white/5 bg-transparent transition-colors duration-150"
        >
          {/* Recursively render child folders */}
          {renderFolderTree(folder.id)}
          
          {/* Render conversations in this folder */}
          {folderConversations.map(convo => (
            <File 
              key={convo.id} 
              value={convo.id?.toString()} 
              className="text-white hover:bg-white/5 bg-transparent transition-colors duration-150"
              isSelected={currentConversationId === convo.id}
            >
              <div 
                className="truncate cursor-pointer"
                onClick={() => handleConversationClick(convo.id as number)}
              >
                {convo.name}
              </div>
            </File>
          ))}
        </TreeFolder>
      );
    });
  };

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Conversations</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowNewFolderInput(true)}
            className="hover:text-gray-300 transition-colors"
            title="New folder"
          >
            <NewFolderIcon />
          </button>
          <button 
            onClick={handleNewChat}
            className="hover:text-gray-300 transition-colors"
            title="New chat"
          >
            <NewFolderIcon />
          </button>
        </div>
      </div>
      
      {showNewFolderInput && (
        <form onSubmit={handleNewFolder} className="mb-3">
          <input
            ref={newFolderInputRef}
            type="text"
            className="w-full bg-[#333333] text-white border border-gray-600 rounded px-2 py-1 text-sm"
            placeholder="New folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onBlur={() => {
              if (!newFolderName.trim()) {
                setShowNewFolderInput(false);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowNewFolderInput(false);
                setNewFolderName("");
              }
            }}
          />
        </form>
      )}
      
      {isLoading ? (
        <div className="text-gray-400 p-2">Loading...</div>
      ) : conversations.length === 0 && folders.length === 0 ? (
        <div className="text-gray-400 p-2">No conversations found</div>
      ) : (
        <Tree className="text-white" initialSelectedId={currentConversationId?.toString()}>
          {/* Unfiled conversations */}
          {unfiledConversations.length > 0 && (
            <TreeFolder 
              name="Unfiled" 
              defaultOpen={true}
              className="text-white hover:bg-white/5 bg-transparent transition-colors duration-150"
            >
              {unfiledConversations.map(convo => (
                <File 
                  key={convo.id} 
                  value={convo.id?.toString()} 
                  className="text-white hover:bg-white/5 bg-transparent transition-colors duration-150"
                  isSelected={currentConversationId === convo.id}
                >
                  <div 
                    className="truncate cursor-pointer"
                    onClick={() => handleConversationClick(convo.id as number)}
                  >
                    {convo.name}
                  </div>
                </File>
              ))}
            </TreeFolder>
          )}
          
          {/* Render the full folder hierarchy */}
          {renderFolderTree(null)}
        </Tree>
      )}
    </div>
  );
} 