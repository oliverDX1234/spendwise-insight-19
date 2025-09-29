import { useState } from "react"
import { Home, Receipt, PieChart, Settings, CreditCard, Target, User, LogOut, AlertCircle, BarChart3, Shield, FileText } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useSubscription } from "@/hooks/useSubscription"
import { useUserRole } from "@/hooks/useUserRole"

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
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const items = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Categories", url: "/categories", icon: PieChart },
  { title: "Analytics", url: "/analytics", icon: BarChart3, requiresPremium: true },
  { title: "Reports", url: "/reports", icon: FileText },
  { title: "Budgets", url: "/budgets", icon: Target },
  { title: "Limits", url: "/limits", icon: AlertCircle },
  { title: "Settings", url: "/settings", icon: Settings },
]

const adminItems = [
  { title: "Dashboard", url: "/admin", icon: Shield },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const { signOut } = useAuth()
  const { isTrial } = useSubscription()
  const { isAdmin } = useUserRole()

  const menuItems = isAdmin ? adminItems : items;

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50"

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <TooltipProvider>
      <Sidebar
        collapsible="icon"
      >
        <SidebarContent className="flex flex-col h-full">
          <SidebarGroup className="flex-1">
            <SidebarGroupLabel>SpendWise</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isDisabled = (item as any).requiresPremium && isTrial && !isAdmin;
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      {isDisabled ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton className="opacity-50 cursor-not-allowed">
                              <item.icon className="mr-2 h-4 w-4" />
                              <span>{item.title}</span>
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Upgrade your plan in order to be able to use this feature</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <SidebarMenuButton asChild>
                          <NavLink to={item.url} end className={getNavCls}>
                            <item.icon className="mr-2 h-4 w-4" />
                            <span>{item.title}</span>
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
          <SidebarGroupContent>
            <SidebarMenu>
              {!isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/profile" className={getNavCls}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start hover:bg-accent/50"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
    </TooltipProvider>
  )
}