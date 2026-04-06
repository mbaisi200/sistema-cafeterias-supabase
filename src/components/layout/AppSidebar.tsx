'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Package,
  UtensilsCrossed,
  UserCog,
  Warehouse,
  DollarSign,
  ShoppingCart,
  LogOut,
  Coffee,
  BarChart3,
  Wallet,
  Plug,
  FileText,
  Bike,
  ExternalLink,
  Users,
  Menu,
  Settings,
  Zap,
  Database,
  Receipt,
  Truck,
  ClipboardList,
  Scissors,
  ShoppingBag,
  Stethoscope,
  Wrench,
  Dumbbell,
  PawPrint,
  Store,
  Heart,
  Layers,
  Building2,
  Croissant,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Mapeamento de ícones para seções dinâmicas do banco
const iconMap: Record<string, any> = {
  LayoutDashboard, Package, UtensilsCrossed, UserCog, Warehouse,
  DollarSign, ShoppingCart, Coffee, BarChart3, Wallet,
  Plug, FileText, Bike, ExternalLink, Users, Menu, Settings,
  ClipboardList, Database, Zap, Receipt, Truck, Scissors,
  ShoppingBag, Stethoscope, Wrench, Dumbbell, PawPrint, Store,
  Heart, Layers, Building2, Croissant,
};

interface MenuItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  external?: boolean;
  submenu?: MenuItem[];
}

const masterMenuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/master/dashboard', icon: LayoutDashboard },
  { title: 'Clientes', url: '/master/clientes', icon: Users },
  { title: 'Segmentos', url: '/master/segmentos', icon: Layers },
  { title: 'Popular Dados', url: '/admin/seed', icon: Database },
  { title: 'Consumo de Dados', url: '/master/consumo-dados', icon: BarChart3 },
  { title: 'Integrações', url: '/master/integracoes', icon: Plug },
  { title: 'Configurações', url: '/master/configuracoes', icon: Coffee },
];

// Fallback hardcoded para admin (usado quando o banco não retorna dados)
const adminMenuItems: MenuItem[] = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'PDV', url: '/pdv', icon: ShoppingCart },
  { title: 'PDV Varejo', url: '/pdv-varejo', icon: Store },
  { title: 'PDV Garçon', url: '/pdv-garcom', icon: UtensilsCrossed },
  { title: 'Caixa', url: '/admin/caixa', icon: Wallet },
  { title: 'Cadastros', url: '/admin/cadastros', icon: Users },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  {
    title: 'Pedidos e OS',
    url: '#',
    icon: FileSpreadsheet,
    submenu: [
      { title: 'Pedidos', url: '/admin/pedidos', icon: ClipboardList },
      { title: 'Ordens de Serviço', url: '/admin/ordens-servico', icon: Wrench },
    ],
  },
  { title: 'Estoque', url: '/admin/estoque', icon: Warehouse },
  { title: 'Mesas', url: '/admin/mesas', icon: UtensilsCrossed },
  { title: 'Delivery', url: '/admin/delivery', icon: Bike },
  { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
  { title: 'Funcionários', url: '/admin/funcionarios', icon: UserCog },
  { title: 'Relatórios', url: '/admin/relatorios', icon: BarChart3 },
  { title: 'Integrações', url: '/admin/integracoes', icon: Plug },
  { title: 'iFood', url: '/admin/integracoes/ifood', icon: Bike },
  { title: 'Cupons e NFEs', url: '/admin/cupons-nfes', icon: FileText },
  { title: 'Notas Fiscais', url: '/admin/nfe', icon: FileText },
];

// Fallback hardcoded para atalho rápido
const atalhoRapidoMenuItems: MenuItem[] = [
  { title: 'Cardápio', url: '/cardapio', icon: Menu, external: true },
  { title: 'Config. Cardápio', url: '/admin/delivery/config', icon: Settings },
  { title: 'iFood', url: '/admin/integracoes/ifood', icon: Bike },
];

// Fallback hardcoded para funcionário
const funcionarioMenuItems: MenuItem[] = [
  { title: 'PDV', url: '/pdv', icon: ShoppingCart },
  { title: 'PDV Varejo', url: '/pdv-varejo', icon: Store },
  { title: 'PDV Garçon', url: '/pdv-garcom', icon: UtensilsCrossed },
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
  const { user, logout, empresaId, role, nomeMarca } = useAuth();
  const pathname = usePathname();

  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[]>([]);
  const [dynamicAtalhoItems, setDynamicAtalhoItems] = useState<MenuItem[]>([]);
  const [hasSegment, setHasSegment] = useState<boolean>(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['pedidos-os']);

  // Carregar seções dinâmicas do Supabase para admin e funcionário
  useEffect(() => {
    if (role !== 'admin' && role !== 'funcionario') return;
    if (!empresaId) return;

    const loadSections = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) return;

        // Get empresa's segmento_id
        const { data: empresa } = await supabase
          .from('empresas')
          .select('segmento_id')
          .eq('id', empresaId)
          .single();

        const segId = empresa?.segmento_id;
        let ativoIds: string[] = [];

        // Track whether empresa has a segment
        if (segId) {
          setHasSegment(true);
        } else {
          setHasSegment(false);
        }

        if (segId) {
          // Query segmento_secoes for this segment
          const { data: segSecoes } = await supabase
            .from('segmento_secoes')
            .select('secao_id, ativo')
            .eq('segmento_id', segId);

          ativoIds = (segSecoes || [])
            .filter((s: any) => s.ativo)
            .map((s: any) => s.secao_id);
        }

        if (ativoIds.length === 0 && !segId) {
          // No segment: fallback to all active sections
          const { data: allSecoes } = await supabase
            .from('secoes_menu')
            .select('*')
            .eq('ativo', true)
            .order('ordem');

          const principal = (allSecoes || [])
            .filter((s: any) => s.grupo === 'principal' && s.visivel_para?.includes(role))
            .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: false }));
          const atalho = (allSecoes || [])
            .filter((s: any) => s.grupo === 'atalho_rapido' && s.visivel_para?.includes(role))
            .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: s.url === '/cardapio' }));

          if (principal.length > 0) {
            setDynamicMenuItems(principal);
          }
          if (atalho.length > 0) {
            setDynamicAtalhoItems(atalho);
          }
          return;
        }

        // Load specific sections
        const { data: secoes } = await supabase
          .from('secoes_menu')
          .select('*')
          .in('id', ativoIds)
          .eq('ativo', true)
          .order('ordem');

        const principal = (secoes || [])
          .filter((s: any) => s.grupo === 'principal' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: false }));
        const atalho = (secoes || [])
          .filter((s: any) => s.grupo === 'atalho_rapido' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: s.url === '/cardapio' }));

        if (principal.length > 0) {
          setDynamicMenuItems(principal);
        }
        if (atalho.length > 0) {
          setDynamicAtalhoItems(atalho);
        }
      } catch (error) {
        console.error('Erro ao carregar seções:', error);
        // Fallback: mantém arrays vazios, usa menus hardcoded na renderização
      }
    };

    loadSections();
  }, [role, empresaId]);

  // Agrupa pedidos e ordens-servico em submenu "Pedidos e OS" quando vem do banco
  const groupDynamicMenus = (items: MenuItem[]): MenuItem[] => {
    const pedidosItem = items.find(i => i.url === '/admin/pedidos');
    const osItem = items.find(i => i.url === '/admin/ordens-servico');

    if (pedidosItem && osItem) {
      const filtered = items.filter(i => i.url !== '/admin/pedidos' && i.url !== '/admin/ordens-servico');
      // Encontrar posição do pedidos para inserir o grupo no mesmo lugar
      const insertIdx = items.findIndex(i => i.url === '/admin/pedidos');
      const parent: MenuItem = {
        title: 'Pedidos e OS',
        url: '#',
        icon: FileSpreadsheet,
        submenu: [pedidosItem, osItem],
      };
      filtered.splice(insertIdx, 0, parent);
      return filtered;
    }
    return items;
  };

  const getMenuItems = (): MenuItem[] => {
    switch (role) {
      case 'master':
        return masterMenuItems;
      case 'admin':
        if (hasSegment) return groupDynamicMenus(dynamicMenuItems);
        return dynamicMenuItems.length > 0 ? groupDynamicMenus(dynamicMenuItems) : adminMenuItems;
      case 'funcionario':
        return dynamicMenuItems.length > 0 ? groupDynamicMenus(dynamicMenuItems) : funcionarioMenuItems;
      default:
        return [];
    }
  };

  const getAtalhoItems = (): MenuItem[] => {
    if (role !== 'admin') return [];
    // Se tem segmento, respeitar os atalhos dinâmicos (mesmo vazio = nenhum atalho)
    if (hasSegment) return dynamicAtalhoItems;
    // Sem segmento: usar dinâmico se disponível, senão fallback hardcoded
    return dynamicAtalhoItems.length > 0 ? dynamicAtalhoItems : atalhoRapidoMenuItems;
  };

  const menuItems = getMenuItems();
  const atalhoItems = getAtalhoItems();

  const handleLogout = async () => {
    await logout();
  };

  // URL do cardápio online com empresa
  const getCardapioUrl = (item: MenuItem) => {
    if (item.external && empresaId) {
      return `${item.url}?empresa=${empresaId}`;
    }
    return item.url;
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
            <span className="text-xs text-muted-foreground">{nomeMarca || 'Café & Restaurante'}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {role === 'master' ? 'Painel Master' : 'Menu Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) =>
                item.submenu ? (
                  <Collapsible
                    key={item.url}
                    open={openSubmenus.includes(item.title.toLowerCase().replace(/\s+/g, '-'))}
                    onOpenChange={(open) => {
                      const key = item.title.toLowerCase().replace(/\s+/g, '-');
                      setOpenSubmenus(prev =>
                        open
                          ? [...prev, key]
                          : prev.filter(k => k !== key)
                      );
                    }}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={item.submenu.some(sub => pathname === sub.url)}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenu sub>
                          {item.submenu.map((sub) => (
                            <SidebarMenuItem key={sub.url}>
                              <SidebarMenuButton
                                asChild
                                isActive={pathname === sub.url}
                                tooltip={sub.title}
                              >
                                <Link href={sub.url}>
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={!item.external && pathname === item.url}
                      tooltip={item.title}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Atalho Rápido - Seção separada para Admin */}
        {role === 'admin' && atalhoItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Atalho Rápido
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {atalhoItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={!item.external && pathname === item.url}
                        tooltip={item.title}
                      >
                        {item.external ? (
                          <a href={getCardapioUrl(item)} target="_blank" rel="noopener noreferrer">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                            <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                          </a>
                        ) : (
                          <Link href={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
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
