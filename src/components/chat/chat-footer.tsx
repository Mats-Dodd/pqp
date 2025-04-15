import { Button } from "../ui/button";
import { ModelsDropdown } from "../mcp/models-dropdown";
import { MCPServicesDropdown } from "../mcp/mcp-services-dropdown";

interface ChatFooterProps {
  isLoading: boolean;
  serviceStarted: boolean;
  services: string[];
  modelsOpen: boolean;
  setModelsOpen: (open: boolean) => void;
  mcpOpen: boolean;
  setMcpOpen: (open: boolean) => void;
  onToggleGrid: () => void;
  onSelectModel?: (model: string) => void;
  onSelectService?: (service: string) => void;
}

export function ChatFooter({
  isLoading,
  serviceStarted,
  services,
  modelsOpen,
  setModelsOpen,
  mcpOpen,
  setMcpOpen,
  onToggleGrid,
  onSelectModel,
  onSelectService
}: ChatFooterProps) {
  return (
    <footer className="font-mono text-xs flex justify-between mt-[var(--line-height)]">
      <div className="text-muted-foreground">Status: {isLoading ? 'Processing' : serviceStarted ? 'MCP Server Running' : 'Online'}</div>
      <div className="flex items-center gap-4">
        <ModelsDropdown 
          open={modelsOpen} 
          onOpenChange={setModelsOpen}
          onSelectModel={onSelectModel}
        />
        
        <MCPServicesDropdown
          open={mcpOpen}
          onOpenChange={setMcpOpen}
          services={services}
          onSelectService={onSelectService}
        />
        
        <Button 
          onClick={onToggleGrid} 
          variant="ghost"
          size="sm"
          className="px-1ch py-0 h-auto transition-colors duration-200 font-mono text-xs text-[#D6A97A]"
        >
          [Debug]
        </Button>
      </div>
    </footer>
  );
} 