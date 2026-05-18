// src/components/sidebar-nav.tsx - Paw0 AKC Navigation
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home,
  FileText,
  Settings,
  Monitor,
  Search,
  BarChart3,
  FolderOpen,
  Shield,
  User,
  Dog,
  Building2
} from 'lucide-react';

interface SidebarNavProps {
  roles: string[];
}

export function SidebarNav({ roles }: SidebarNavProps) {
  const pathname = usePathname();
  
  const isAdmin = roles && Array.isArray(roles) && roles.includes('Admin');

  return (
    <nav className="flex flex-col gap-2">
      {/* Public navigation items */}
      <Button 
        asChild 
        variant={pathname === '/' ? 'secondary' : 'ghost'} 
        className="w-full justify-start"
      >
        <Link href="/">
          <Home className="mr-2 h-4 w-4" />
          Home
        </Link>
      </Button>
      
      <Button
        asChild
        variant={pathname === '/reports' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/reports">
          <FileText className="mr-2 h-4 w-4" />
          Reports
        </Link>
      </Button>

      <Button
        asChild
        variant={pathname === '/claims' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/claims">
          <Dog className="mr-2 h-4 w-4" />
          Registrations
        </Link>
      </Button>

      <Button 
        asChild 
        variant={pathname === '/inspector' ? 'secondary' : 'ghost'} 
        className="w-full justify-start"
      >
        <Link href="/inspector">
          <Search className="mr-2 h-4 w-4" />
          Inspector
        </Link>
      </Button>
      
      {/* Analytics - Hidden (keeping code for future use) */}
      {/* <Button
        asChild
        variant={pathname === '/analytics' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/analytics">
          <BarChart3 className="mr-2 h-4 w-4" />
          Analytics
        </Link>
      </Button> */}

      {/* Documents - Show for everyone, access control via FGA */}
      <Button
        asChild
        variant={pathname === '/documents' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/documents">
          <FolderOpen className="mr-2 h-4 w-4" />
          Documents
        </Link>
      </Button>

      {/* API Gateway Demo - Kong integration showcase */}
      <Button
        asChild
        variant={pathname === '/api-gateway' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/api-gateway">
          <Shield className="mr-2 h-4 w-4" />
          API Gateway
        </Link>
      </Button>

      {/* Profile Management */}
      <Button
        asChild
        variant={pathname === '/profile' ? 'secondary' : 'ghost'}
        className="w-full justify-start"
      >
        <Link href="/profile">
          <User className="mr-2 h-4 w-4" />
          Profile Management
        </Link>
      </Button>

      {/* Admin-only navigation items */}
      {isAdmin && (
        <>
          <Button
            asChild
            variant={pathname === '/admin' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link href="/admin">
              <Settings className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Link>
          </Button>

          <Button
            asChild
            variant={pathname === '/admin/sessions' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link href="/admin/sessions">
              <Monitor className="mr-2 h-4 w-4" />
              Session Management
            </Link>
          </Button>

          <Button
            asChild
            variant={pathname === '/organization-management' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
          >
            <Link href="/organization-management">
              <Building2 className="mr-2 h-4 w-4" />
              Organization Settings
            </Link>
          </Button>
        </>
      )}
    </nav>
  );
}