'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { ListTodo, History, Settings, Map } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const links = [
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ListTodo,
  },
    {
    name: 'Map',
    href: '/map',
    icon: Map,
  },
  {
    name: 'History',
    href: '/history',
    icon: History,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface MainNavProps {
  isCollapsed: boolean;
}

export function MainNav({ isCollapsed }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2 px-2">
      {links.map((link) => {
        const isActive = pathname === link.href;
        if (isCollapsed) {
          return (
            <Tooltip key={link.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={link.href}
                  className={cn(
                    buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'icon' }),
                    'h-9 w-9',
                    isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  <span className="sr-only">{link.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-4">
                {link.name}
              </TooltipContent>
            </Tooltip>
          );
        }
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              buttonVariants({ variant: isActive ? 'default' : 'ghost', size: 'sm' }),
              isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground',
              'justify-start'
            )}
          >
            <link.icon className="mr-2 h-4 w-4" />
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
