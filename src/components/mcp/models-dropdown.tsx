import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface ModelsDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectModel?: (model: string) => void;
}

export function ModelsDropdown({ open, onOpenChange, onSelectModel }: ModelsDropdownProps) {
  const models = [
    "Claude 3 Opus",
    "Claude 3 Sonnet",
    "Claude 3 Haiku"
  ];
  
  const handleSelect = (model: string) => {
    if (onSelectModel) {
      onSelectModel(model);
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger 
        className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
      >
        {'<Models>'}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="font-mono text-xs bg-black border-2 border-[var(--text-color)] rounded-none shadow-lg p-0 z-50"
        style={{ lineHeight: 'var(--line-height)' }}
      >
        {models.map((model, index) => (
          <DropdownMenuItem 
            key={index} 
            onClick={() => handleSelect(model)}
            className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer"
          >
            {model}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 