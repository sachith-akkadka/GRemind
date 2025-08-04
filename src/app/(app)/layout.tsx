'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppLogo } from '@/components/icons';
import { MainNav } from '@/components/main-nav';
import { UserNav } from '@/components/user-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ThemeProvider } from 'next-themes';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isMobile = useIsMobile();
  const pathname = usePathname();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        {!isMobile && (
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-card transition-all duration-300 ease-in-out sm:flex',
              isCollapsed && 'w-14'
            )}
          >
            <div
              className={cn(
                'flex h-16 items-center border-b px-6',
                isCollapsed && 'justify-center px-2'
              )}
            >
              <Link href="/tasks" className="flex items-center gap-2 font-semibold">
                <AppLogo className="h-6 w-6 text-primary" />
                <span className={cn('', isCollapsed && 'sr-only')}>G-Remind</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
              <MainNav isCollapsed={isCollapsed} />
            </div>
          </aside>
        )}
        <div
          className={cn(
            'flex flex-col sm:gap-4 sm:py-4 transition-all duration-300 ease-in-out',
            !isMobile && 'sm:pl-64',
            isCollapsed && !isMobile && 'sm:pl-20'
          )}
        >
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="sm:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs">
                  <div className="flex h-16 items-center border-b px-6">
                    <Link href="/tasks" className="flex items-center gap-2 font-semibold">
                      <AppLogo className="h-6 w-6 text-primary" />
                      <span>G-Remind</span>
                    </Link>
                  </div>
                  <div className="py-4">
                    <MainNav isCollapsed={false} />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            {!isMobile && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden sm:flex"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
            )}
            <div className="ml-auto flex items-center gap-2">
              <UserNav />
            </div>
          </header>
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
    </ThemeProvider>
  );
}
