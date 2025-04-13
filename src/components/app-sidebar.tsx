import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Home, Settings } from "lucide-react"; // Example icons

// Example menu items
const items = [
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

export function AppSidebar() {
  return (
    <Sidebar className="font-mono font-medium bg-[#1F1F1F] text-white border-r border-grid">
      <SidebarHeader className="p-2ch flex items-center">
        PQP
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2ch py-[calc(var(--line-height)/2)]">
            Application
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    className="px-2ch py-[calc(var(--line-height)/2)] hover:bg-[#2A2A2A] transition-colors"
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