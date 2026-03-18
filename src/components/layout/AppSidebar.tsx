'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Package,
  FolderOpen,
  UtensilsCrossed,
  UserCog,
  Warehouse,
  DollarSign,
  ShoppingCart,
  LogOut,
  Coffee,
  Settings,
  BarChart3,
  Wallet,
  Plug,
  Truck,
  Printer,
  Database,
  Sun,
  Moon,
} from 'lucide-react';

const masterMenuItems = [
  { title: 'Dashboard', url: '/master/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', url: '/master/clientes', icon: Users },
  { title: 'Consumo de Dados', url: '/master/consumo-dados', icon: Database },
  { title: 'Integrações', url: '/master/integracoes', icon: Plug },
  { title: 'Métricas', url: '/master/metricas', icon: BarChart3 },
  { title: 'Configurações', url: '/master/configuracoes', icon: Settings },
];

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'PDV', url: '/pdv', icon: ShoppingCart },
  { title: 'Caixa', url: '/admin/caixa', icon: Wallet },
  { title: 'Delivery', url: '/admin/delivery', icon: Truck },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  { title: 'Categorias', url: '/admin/categorias', icon: FolderOpen },
  { title: 'Mesas', url: '/admin/mesas', icon: UtensilsCrossed },
  { title: 'Funcionários', url: '/admin/funcionarios', icon: UserCog },
  { title: 'Estoque', url: '/admin/estoque', icon: Warehouse },
  { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
  { title: 'Relatórios', url: '/admin/relatorios', icon: BarChart3 },
  { title: 'Integrações', url: '/admin/integracoes', icon: Plug },
  { title: 'Cupom Fiscal', url: '/admin/configuracoes-cupom', icon: Printer },
];

const funcionarioMenuItems = [
  { title: 'PDV', url: '/pdv', icon: ShoppingCart },
  { title: 'Caixa', url: '/admin/caixa', icon: Wallet },
];

const roleLabels: Record<string, string> = {
  master: 'Master',
  admin: 'Administrador',
  funcionario: 'Funcionário',
};

const roleColors: Record<string, string> = {
  master: 'bg-primary text-primary-foreground',
  admin: 'bg-primary text-primary-foreground',
  funcionario: 'bg-secondary text-secondary-foreground',
};

export function AppSidebar() {
  const { user, logout, empresaId, role } = useAuth();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  const isDark = resolvedTheme === 'dark';

  const getMenuItems = () => {
    switch (role) {
      case 'master':
        return masterMenuItems;
      case 'admin':
        return adminMenuItems;
      case 'funcionario':
        return funcionarioMenuItems;
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Coffee className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Gestão</span>
            <span className="text-xs text-muted-foreground">Café & Restaurante</span>
          </div>
        </div>
        
        {/* Theme Toggle */}
        <div className="mt-3 mx-2 p-1 rounded-lg bg-muted flex items-center gap-1 group-data-[collapsible=icon]:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme('light')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md transition-all ${
              !isDark 
                ? 'bg-background shadow-sm text-amber-500' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sun className="h-4 w-4" />
            <span className="text-xs font-medium">Claro</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme('dark')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md transition-all ${
              isDark 
                ? 'bg-primary/20 text-primary shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span className="text-xs font-medium">Escuro</span>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {role === 'master' ? 'Painel Master' : 'Menu Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-8 w-8">
                <AvatarFallback className={roleColors[role || 'funcionario']}>
                  {user?.nome?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium truncate">{user?.nome}</span>
                <Badge variant="secondary" className="text-xs w-fit">
                  {roleLabels[role || 'funcionario']}
                </Badge>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
