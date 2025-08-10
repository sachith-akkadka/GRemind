
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
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
    const isMobile = useIsMobile();
    const { user, loading } = useAuth();
    const appName = "G-Remind";

    if (loading) {
        return <div className="flex h-screen w-full items-center justify-center"><div>Loading...</div></div>;
    }
    
    return (
        <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-primary/30 via-accent/30 to-background dark:from-primary/20 dark:via-accent/20">
            <div className="flex flex-col">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/20 backdrop-blur-sm px-4 md:px-6">
                {isMobile ? (
                <Sheet>
                    <SheetTrigger asChild>
                    <Button size="icon" variant="outline" className="sm:hidden">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle Menu</span>
                    </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="sm:max-w-xs bg-card/20 backdrop-blur-sm">
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
                ) : (
                    <Link href="/tasks" className="flex items-center gap-2 font-semibold overflow-hidden mr-4">
                        <AppLogo className="h-8 w-8 text-primary flex-shrink-0" />
                        <span className="font-bold text-2xl animate-text-shimmer bg-gradient-to-r from-primary via-accent to-primary bg-[200%_auto] bg-clip-text text-transparent">
                           {appName}
                        </span>
                    </Link>
                )}
                
                <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
                <UserNav />
                </div>
            </header>
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 md:p-6">
                {children}
            </main>
            </div>
        </div>
        </TooltipProvider>
    );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {

  return (
    <AuthProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
    </AuthProvider>
  );
}
