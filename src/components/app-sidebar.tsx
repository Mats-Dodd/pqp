import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Home, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { ConvoTree } from "@/components/convo-tree";

// Core menu items
const menuItems = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

interface AppSidebarProps {
  onSelectConversation?: (id: number) => void;
  onNewChat?: () => void;
  currentConversationId?: number;
}

export function AppSidebar({ 
  onSelectConversation, 
  onNewChat,
  currentConversationId 
}: AppSidebarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+S (or Ctrl+S on Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Sidebar className="font-mono font-medium bg-[#1F1F1F] text-white">
      <SidebarHeader className="p-2ch flex items-center justify-between">
        <span>PQP</span>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupContent className="px-2ch py-[calc(var(--line-height)/2)]">
            <ConvoTree 
              onSelectConversation={onSelectConversation}
              onNewChat={onNewChat}
              currentConversationId={currentConversationId}
            />
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="px-2ch py-[calc(var(--line-height)/2)]">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className="px-2ch py-[calc(var(--line-height)/2)] hover:bg-hover-background transition-colors"
                  >
                    <a href={item.url} className="flex items-center gap-2ch">
                      <item.icon className="size-[var(--line-height)]"/>
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="py-2ch px-2ch text-center">
        <span className="text-sm opacity-70">v1.0.0</span>
      </SidebarFooter>
    </Sidebar>
  );
} 