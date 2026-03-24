'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

const masterMenuItems = [
  { title: 'Dashboard', url: '/master/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', url: '/master/clientes', icon: Users },
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
  master: 'bg-blue-600',
  admin: 'bg-blue-600',
  funcionario: 'bg-green-600',
};

export function AppSidebar() {
  const { user, logout, empresaId, role } = useAuth();
  const pathname = usePathname();

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
      <SidebarHeader className="border-b border-blue-100 bg-blue-50">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Gestão</span>
            <span className="text-xs text-muted-foreground">Café & Restaurante</span>
          </div>
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

      <SidebarFooter className="border-t border-blue-100 bg-blue-50">
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
