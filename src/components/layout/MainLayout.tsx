'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTheme } from 'next-themes';

interface MainLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { title: string; href?: string }[];
}

export function MainLayout({ children, breadcrumbs = [] }: MainLayoutProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset className={darkMode
        ? 'bg-gradient-to-br from-[#1a1a2e] via-[#1e2235] to-[#16213e]'
        : 'bg-gradient-to-br from-[#e8f0ed] via-[#eaeae6] to-[#f0eddd]'
      }>
        <header className={`flex h-14 shrink-0 items-center gap-2 border-b px-4 ${
          darkMode
            ? 'border-white/10 bg-white/5 backdrop-blur-sm'
            : 'border-teal-100/60 bg-white/50 backdrop-blur-sm'
        }`}>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem className={index < breadcrumbs.length - 1 ? 'hidden md:block' : ''}>
                      {index < breadcrumbs.length - 1 ? (
                        <BreadcrumbLink href={crumb.href}>
                          {crumb.title}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && (
                      <BreadcrumbSeparator className="hidden md:block" />
                    )}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 md:px-6 lg:px-8 md:py-6">
          <div className="w-full max-w-[1200px]">
          {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
