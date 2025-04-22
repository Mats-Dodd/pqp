import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface Model {
  id: string;
  name: string;
}

interface ModelsDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectModel?: (modelId: string) => void; 
  selectedModelId: string;
}

export function ModelsDropdown({ open, onOpenChange, onSelectModel, selectedModelId }: ModelsDropdownProps) {
  const models: Model[] = [
    { id: "claude-3-5-sonnet-latest", name: "Claude 3.5 Sonnet" },
    { id: "claude-3-7-sonnet-latest", name: "Claude 3.7 Sonnet" },
    { id: "claude-3-5-haiku-latest", name: "Claude 3.5 Haiku" },
    { id: "gpt-4.1-2025-04-14", name: "GPT-4.1 Preview" }
  ];
  
  const selectedModel = models.find(model => model.id === selectedModelId);
  
  const handleSelect = (modelId: string) => { 
    if (onSelectModel) {
      onSelectModel(modelId); 
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger 
        className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
      >
        {selectedModel ? selectedModel.name : 'Select Model'}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="font-mono text-xs bg-black border-2 border-[var(--text-color)] rounded-none shadow-lg p-0 z-50"
        style={{ lineHeight: 'var(--line-height)' }}
      >
        {models.map((model, index) => (
          <DropdownMenuItem 
            key={index} 
            onClick={() => handleSelect(model.id)} 
            className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer"
          >
            {model.name} 
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 