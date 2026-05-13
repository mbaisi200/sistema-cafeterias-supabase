'use client';

import React from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Truck, UserCheck, Wrench, ChevronLeft, UserCog, ClipboardList } from 'lucide-react';
import { ClientesTab } from './ClientesTab';
import { FornecedoresTab } from './FornecedoresTab';
import { VendedoresTab } from './VendedoresTab';
import { ServicosTab } from './ServicosTab';
import { FuncionariosTab } from './FuncionariosTab';
import { ListagemTab } from './ListagemTab';

export default function CadastrosPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Cadastros' }]}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Cadastros</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Gerencie clientes, vendedores, fornecedores e serviços
              </p>
            </div>
          </div>

          <Tabs defaultValue="clientes" className="space-y-6">
            <TabsList>
              <TabsTrigger value="clientes" className="gap-2">
                <Users className="h-4 w-4" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="vendedores" className="gap-2">
                <UserCheck className="h-4 w-4" />
                Vendedores
              </TabsTrigger>
              <TabsTrigger value="fornecedores" className="gap-2">
                <Truck className="h-4 w-4" />
                Fornecedores
              </TabsTrigger>
              <TabsTrigger value="servicos" className="gap-2">
                <Wrench className="h-4 w-4" />
                Serviços
              </TabsTrigger>
              <TabsTrigger value="funcionarios" className="gap-2">
                <UserCog className="h-4 w-4" />
                Funcionários
              </TabsTrigger>
              <TabsTrigger value="listagem" className="gap-2">
                <ClipboardList className="h-4 w-4" />
                Listagem
              </TabsTrigger>
            </TabsList>

            <TabsContent value="clientes">
              <ClientesTab />
            </TabsContent>

            <TabsContent value="vendedores">
              <VendedoresTab />
            </TabsContent>

            <TabsContent value="fornecedores">
              <FornecedoresTab />
            </TabsContent>

            <TabsContent value="servicos">
              <ServicosTab />
            </TabsContent>

            <TabsContent value="funcionarios">
              <FuncionariosTab />
            </TabsContent>
            <TabsContent value="listagem">
              <ListagemTab />
            </TabsContent>
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
