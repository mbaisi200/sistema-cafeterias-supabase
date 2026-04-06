'use client';

import React from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Truck, UserCheck } from 'lucide-react';
import { ClientesTab } from './ClientesTab';
import { FornecedoresTab } from './FornecedoresTab';
import { VendedoresTab } from './VendedoresTab';

export default function CadastrosPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout breadcrumbs={[{ title: 'Admin' }, { title: 'Cadastros' }]}>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Cadastros</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie clientes, vendedores e fornecedores
            </p>
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
          </Tabs>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
