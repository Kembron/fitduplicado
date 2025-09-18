"use client"

import type * as React from "react"
import { Frame, GalleryVerticalEnd, Settings2, Users, BarChart3, Shield, Home } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar"

// This is sample data.
const data = {
  user: {
    name: "Administrador",
    email: "admin@fithouse.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "FitHouse Gym",
      logo: GalleryVerticalEnd,
      plan: "Sistema de Gestión",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Socios",
      url: "/members",
      icon: Users,
    },
    {
      title: "Reportes",
      url: "/reports",
      icon: BarChart3,
    },
    {
      title: "Auditoría",
      url: "/audit",
      icon: Shield,
    },
  ],
  projects: [
    {
      name: "Gestión Rápida",
      url: "#",
      icon: Frame,
    },
    {
      name: "Configuración",
      url: "#",
      icon: Settings2,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
