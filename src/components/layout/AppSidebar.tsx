'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
  Shield,
  WashingMachine,
  Image,
  Sun,
  Moon,
  Ruler,
  ArrowUpDown,
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
  Heart, Layers, Building2, Croissant, Shield, WashingMachine,
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
  { title: 'Popular Dados', url: '/master/seed', icon: Database },
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
  { title: 'Unidades', url: '/admin/configuracoes/unidades', icon: Ruler },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  {
    title: 'Pedidos e OS',
    url: '#',
    icon: FileSpreadsheet,
    submenu: [
      { title: 'Pedidos', url: '/admin/pedidos', icon: ClipboardList },
      { title: 'Ordens de Serviço', url: '/admin/ordens-servico', icon: Wrench },
      { title: 'OS Lavanderia', url: '/admin/os-lavanderia', icon: WashingMachine },
    ],
  },
  { title: 'Estoque', url: '/admin/estoque', icon: Warehouse },
  { title: 'Relatório Estoque', url: '/admin/estoque/relatorio', icon: ArrowUpDown },
  { title: 'Mesas', url: '/admin/mesas', icon: UtensilsCrossed },
  { title: 'Delivery', url: '/admin/delivery', icon: Bike },
  { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
  { title: 'Relatórios', url: '/admin/relatorios', icon: BarChart3 },
  { title: 'Dispositivos', url: '/admin/dispositivos', icon: Shield },
  { title: 'Integrações', url: '/admin/integracoes', icon: Plug },
  { title: 'iFood', url: '/admin/integracoes/ifood', icon: Bike },
  {
    title: 'Uber Eats',
    url: '#',
    icon: Bike,
    submenu: [
      { title: 'Configuração', url: '/admin/integracoes/uber-eats', icon: Settings },
      { title: 'Produtos', url: '/admin/integracoes/uber-eats/produtos', icon: Package },
      { title: 'Pedidos', url: '/admin/integracoes/uber-eats/pedidos', icon: ShoppingBag },
    ],
  },
  { title: 'Cupons Fiscais', url: '/admin/cupons-nfes', icon: FileText },
  { title: 'Notas Fiscais de Entrada', url: '/admin/nfe', icon: FileText },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
];

// Fallback hardcoded para atalho rápido
const atalhoRapidoMenuItems: MenuItem[] = [
  { title: 'Cardápio', url: '/cardapio', icon: Menu, external: true },
  { title: 'Config. Cardápio', url: '/admin/delivery/config', icon: Settings },
  { title: 'iFood', url: '/admin/integracoes/ifood', icon: Bike },
  { title: 'Uber Eats', url: '/admin/integracoes/uber-eats', icon: Bike },
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
  master: 'bg-teal-600',
  admin: 'bg-teal-600',
  funcionario: 'bg-cyan-600',
};

export function AppSidebar() {
  const { user, logout, empresaId, role, nomeMarca } = useAuth();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  const [dynamicMenuItems, setDynamicMenuItems] = useState<MenuItem[]>([]);
  const [dynamicAtalhoItems, setDynamicAtalhoItems] = useState<MenuItem[]>([]);
  const [hasSegment, setHasSegment] = useState<boolean>(false);
  const [openSubmenus, setOpenSubmenus] = useState<string[]>(['pedidos-os']);
  const [dispositivosPendentes, setDispositivosPendentes] = useState(0);


  // Buscar dispositivos pendentes para admin
  useEffect(() => {
    if (role !== 'admin') return;
    const fetchPendentes = async () => {
      try {
        const res = await fetch('/api/dispositivos/pendentes');
        const data = await res.json();
        if (data.pendentes !== undefined) setDispositivosPendentes(data.pendentes);
      } catch {}
    };
    fetchPendentes();
    const interval = setInterval(fetchPendentes, 30000);
    return () => clearInterval(interval);
  }, [role]);


  // Carregar seções dinâmicas do Supabase para admin e funcionário (com cache)
  useEffect(() => {
    if (role !== 'admin' && role !== 'funcionario') return;
    if (!empresaId) return;

    const CACHE_KEY = `sidebar_menu_${empresaId}_${role}`;
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

    // Reconstruir MenuItem a partir de dados serializáveis (sem funções/ícones)
    const rebuildMenuItems = (raw: Array<{ title: string; url: string; icone: string; external: boolean }>): MenuItem[] =>
      raw.map(r => ({ title: r.title, url: r.url, icon: iconMap[r.icone] || LayoutDashboard, external: r.external }));

    const loadSections = async () => {
      try {
        // Verificar cache no sessionStorage (dados brutos sem ícones)
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const { timestamp, principal, atalho, hasSeg } = parsed;
            if (Date.now() - timestamp < CACHE_TTL && Array.isArray(principal)) {
              setDynamicMenuItems(rebuildMenuItems(principal));
              setDynamicAtalhoItems(rebuildMenuItems(atalho || []));
              setHasSegment(hasSeg || false);
              return;
            }
          } catch { /* cache inválido, seguir com fetch */ }
        }

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

        if (segId) {
          setHasSegment(true);
        } else {
          setHasSegment(false);
        }

        if (segId) {
          const { data: segSecoes } = await supabase
            .from('segmento_secoes')
            .select('secao_id, ativo')
            .eq('segmento_id', segId);

          ativoIds = (segSecoes || [])
            .filter((s: any) => s.ativo)
            .map((s: any) => s.secao_id);
        }

        // Coletar seções do banco
        let secoesData: any[] = [];
        if (ativoIds.length === 0 && !segId) {
          const { data: allSecoes } = await supabase
            .from('secoes_menu')
            .select('*')
            .eq('ativo', true)
            .order('ordem');
          secoesData = allSecoes || [];
        } else {
          const { data: secoes } = await supabase
            .from('secoes_menu')
            .select('*')
            .in('id', ativoIds)
            .eq('ativo', true)
            .order('ordem');
          secoesData = secoes || [];
        }

        const principalResult = secoesData
          .filter((s: any) => s.grupo === 'principal' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: false }));
        const atalhoResult = secoesData
          .filter((s: any) => s.grupo === 'atalho_rapido' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icon: iconMap[s.icone] || LayoutDashboard, external: s.url === '/cardapio' }));

        setDynamicMenuItems(principalResult);
        setDynamicAtalhoItems(atalhoResult);

        // Salvar no cache apenas dados brutos serializáveis (nome da string do ícone, não a função)
        const rawPrincipal = secoesData
          .filter((s: any) => s.grupo === 'principal' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icone: s.icone, external: false }));
        const rawAtalho = secoesData
          .filter((s: any) => s.grupo === 'atalho_rapido' && s.visivel_para?.includes(role))
          .map((s: any) => ({ title: s.nome, url: s.url, icone: s.icone, external: s.url === '/cardapio' }));

        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          principal: rawPrincipal,
          atalho: rawAtalho,
          hasSeg: !!segId,
        }));
      } catch (error) {
        console.error('Erro ao carregar seções:', error);
        // Se há cache mesmo expirado, usar como fallback
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.principal)) {
              setDynamicMenuItems(rebuildMenuItems(parsed.principal));
              setDynamicAtalhoItems(rebuildMenuItems(parsed.atalho || []));
              setHasSegment(parsed.hasSeg || false);
            }
          } catch { /* ignore */ }
        }
      }
    };

    loadSections();
  }, [role, empresaId]);

  // Agrupa pedidos e ordens-servico em submenu "Pedidos e OS" quando vem do banco
  const groupDynamicMenus = (items: MenuItem[]): MenuItem[] => {
    const pedidosItem = items.find(i => i.url === '/admin/pedidos');
    const osItem = items.find(i => i.url === '/admin/ordens-servico');
    const osLavanderiaItem = items.find(i => i.url === '/admin/os-lavanderia');

    // Group Pedidos + OS + OS Lavanderia into a submenu
    const osItems = [osItem, osLavanderiaItem].filter(Boolean) as MenuItem[];

    if (pedidosItem && osItems.length > 0) {
      const urlsToRemove = ['/admin/pedidos', '/admin/ordens-servico', '/admin/os-lavanderia'];
      const filtered = items.filter(i => !urlsToRemove.includes(i.url));
      const insertIdx = items.findIndex(i => i.url === '/admin/pedidos');
      const parent: MenuItem = {
        title: 'Pedidos e OS',
        url: '#',
        icon: FileSpreadsheet,
        submenu: [pedidosItem, ...osItems],
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
      <SidebarHeader className={`border-b ${darkMode ? 'border-white/10 bg-white/5' : 'border-teal-400/15 bg-white/5'}`}>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${darkMode ? 'bg-gradient-to-br from-cyan-400/20 to-teal-400/20 border border-cyan-400/20' : 'bg-gradient-to-br from-teal-500 to-cyan-500'}`}>
            <Coffee className={`h-5 w-5 ${darkMode ? 'text-cyan-300' : 'text-white'}`} />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden flex-1">
            <span className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-white'}`}>MB Sistemas</span>
            <span className={`text-xs ${darkMode ? 'text-teal-300/70' : 'text-teal-200/80'}`}>{nomeMarca || 'Sistemas'}</span>
          </div>
          <button
            onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-white/5 hover:bg-white/10 text-teal-300' : 'bg-white/10 hover:bg-white/20 text-white'}`}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
                    key={item.title.toLowerCase().replace(/\s+/g, '-')}
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
                        <SidebarMenuSub>
                          {item.submenu.map((sub) => (
                            <SidebarMenuSubItem key={sub.url}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === sub.url}
                              >
                                <Link href={sub.url}>
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
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
                        {item.title === 'Dispositivos' && dispositivosPendentes > 0 && (
                          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1">
                            {dispositivosPendentes}
                          </span>
                        )}
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

      <SidebarFooter className={`border-t ${darkMode ? 'border-white/10 bg-transparent' : 'border-teal-400/20 bg-transparent'}`}>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className={`flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center ${darkMode ? 'bg-white/5 rounded-lg mx-1' : 'bg-white/10 rounded-lg mx-1'}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`bg-gradient-to-br from-teal-500 to-cyan-500 text-white ${darkMode ? 'border border-teal-400/30' : ''}`}>
                  {user?.nome?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 group-data-[collapsible=icon]:hidden">
                <span className={`text-sm font-medium truncate ${darkMode ? 'text-slate-100' : 'text-white'}`}>{user?.nome}</span>
                <Badge variant="secondary" className={`text-xs w-fit ${darkMode ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-white/15 text-white border-white/20'}`}>
                  {roleLabels[role || 'funcionario']}
                </Badge>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} tooltip="Sair" className={darkMode ? 'text-white/60 hover:text-rose-400 hover:bg-rose-500/10' : 'text-white/70 hover:text-red-200 hover:bg-red-400/15'}>
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
