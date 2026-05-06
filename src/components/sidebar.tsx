// src/components/sidebar.tsx - Clean production version
import { getSession } from '@auth0/nextjs-auth0';
import { SidebarNav } from './sidebar-nav';
import { OrgSwitcher } from './org-switcher';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Building2 } from 'lucide-react';

export async function Sidebar() {
  const session = await getSession();
  const user = session?.user;
  const roles = user?.['https://agency-inc-demo.com/roles'] || [];

  const orgName = user?.['https://agency-inc-demo.com/org_name'] || '';
  const orgLogo = user?.['https://agency-inc-demo.com/org_logo'];
  const companyName = orgName ? `EnergyCo | ${orgName}` : 'EnergyCo';

  return (
    <aside className="hidden w-64 flex-col border-r bg-background p-4 md:flex">
      <div className="mb-4 flex items-center gap-3">
        {orgLogo ? (
          <Image
            src={orgLogo}
            alt={`${companyName} Logo`}
            width={32}
            height={32}
            className="rounded-md"
          />
        ) : (
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
        )}
        <h2 className="text-xl font-bold">{companyName}</h2>
      </div>

      {user && (
        <>
          <OrgSwitcher userEmail={user.email} />
          <div className="mb-4" />
        </>
      )}

      <SidebarNav roles={roles} />

      <div className="mt-auto">
        {user ? (
          <div className="flex items-center gap-3">
            <Image
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`}
              alt="User Avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
            <div className="flex flex-col min-w-0">
               <span className="text-sm font-medium truncate" title={user.name}>
                {user.name}
               </span>
               <Button asChild variant="ghost" className="h-auto p-0 justify-start text-xs text-muted-foreground">
                <Link href="/api/auth/logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/api/auth/login?returnTo=/reports">
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}