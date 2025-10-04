import {
  Home,
  Receipt,
  PieChart,
  User,
  LogOut,
  AlertCircle,
  BarChart3,
  Shield,
  FileText,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserRole } from "@/hooks/useUserRole";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Logo from "./ui/Logo";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresPremium?: boolean;
};

const items: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Categories", url: "/categories", icon: PieChart },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    requiresPremium: true,
  },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Limits", url: "/limits", icon: AlertCircle },
];

const adminItems: MenuItem[] = [
  { title: "Dashboard", url: "/admin", icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const { signOut } = useAuth();
  const { isTrial } = useSubscription();
  const { isAdmin } = useUserRole();

  const menuItems = isAdmin ? adminItems : items;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
      : "text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-all duration-200";

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarContent className="flex flex-col h-full">
          <SidebarGroup className="flex-1">
            <SidebarGroupLabel className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
              <Logo className="!w-5 !h-5" />
              SpendWise
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {menuItems.map((item) => {
                  const isDisabled =
                    item.requiresPremium && isTrial && !isAdmin;

                  return (
                    <SidebarMenuItem key={item.title}>
                      {isDisabled ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton className="opacity-50 cursor-not-allowed rounded-lg py-5 text-foreground/50">
                              <item.icon className="h-5 w-5" />
                              <span className="text-sm">{item.title}</span>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            <p>Upgrade your plan to use this feature</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end
                            className={`${getNavCls({
                              isActive: isActive(item.url),
                            })} rounded-lg py-5`}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="text-sm">{item.title}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Bottom section with profile and logout */}
          <SidebarGroup>
            <SidebarGroupContent className="border-t pt-4">
              <SidebarMenu className="space-y-1">
                {!isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/profile"
                        className={`${getNavCls({
                          isActive: isActive("/profile"),
                        })} rounded-lg py-5`}
                      >
                        <User className="h-5 w-5" />
                        <span className="text-sm">Profile</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-foreground/80 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-lg py-3 h-auto"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm">Logout</span>
                    </Button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
