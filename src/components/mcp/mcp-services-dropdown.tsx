import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface MCPServicesDropdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: string[];
  onSelectService?: (service: string) => void;
}

export function MCPServicesDropdown({
  open,
  onOpenChange,
  services,
  onSelectService
}: MCPServicesDropdownProps) {
  const handleSelect = (service: string) => {
    if (onSelectService) {
      onSelectService(service);
    }
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger 
        className="px-1ch py-0 h-auto hover:text-[var(--accent-color)] transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
      >
        {'<MCP>'}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="font-mono text-xs bg-black border-2 border-[var(--text-color)] rounded-none shadow-lg p-0 z-50"
        style={{ lineHeight: 'var(--line-height)' }}
      >
        {services.length > 0 ? (
          services.map((service, index) => (
            <DropdownMenuItem 
              key={index}
              onClick={() => handleSelect(service)}
              className="px-2ch py-0 h-[var(--line-height)] hover:bg-[rgba(214,169,122,0.1)] hover:text-[#D6A97A] text-white cursor-pointer"
            >
              {service}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem className="px-2ch py-0 h-[var(--line-height)] text-white cursor-default">
            No services found
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 