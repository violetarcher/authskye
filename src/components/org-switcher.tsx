'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronDown, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  display_name: string;
  logo_url: string;
  isCurrent: boolean;
}

interface CurrentOrganization {
  id: string;
  name: string;
  logo: string;
}

interface OrgSwitcherProps {
  userEmail?: string;
}

export function OrgSwitcher({ userEmail }: OrgSwitcherProps = {}) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<CurrentOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/user/organizations');

        if (!response.ok) {
          throw new Error('Failed to fetch organizations');
        }

        const data = await response.json();
        setOrganizations(data.organizations || []);
        setCurrentOrg(data.currentOrganization);
      } catch (err) {
        console.error('Error fetching organizations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organizations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOrgSwitch = async (orgId: string) => {
    try {
      setIsSwitching(true);
      setIsOpen(false);

      const loginUrl = new URL('/api/auth/login', window.location.origin);
      loginUrl.searchParams.set('organization', orgId);
      loginUrl.searchParams.set('returnTo', window.location.pathname);

      if (userEmail) {
        loginUrl.searchParams.set('login_hint', userEmail);
      }

      window.location.href = loginUrl.toString();
    } catch (err) {
      console.error('Error switching organization:', err);
      setError('Failed to switch organization');
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!currentOrg || organizations.length <= 1) {
    return null;
  }

  const logoUrl = currentOrg.logo || "https://ui-avatars.com/api/?name=Org&background=3b82f6&color=fff";

  if (isSwitching) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="text-sm">Switching...</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Image
            src={logoUrl}
            alt={`${currentOrg.name} Logo`}
            width={16}
            height={16}
            className="h-4 w-4 rounded flex-shrink-0"
          />
          <span className="truncate text-sm">{currentOrg.name}</span>
        </div>
        <ChevronDown className={cn(
          "ml-2 h-4 w-4 opacity-50 flex-shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-lg z-50">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Switch Organization
          </div>
          <div className="h-px bg-border mx-1" />
          <div className="p-1">
            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => handleOrgSwitch(org.id)}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  org.isCurrent && "bg-accent"
                )}
              >
                {org.logo_url ? (
                  <Image
                    src={org.logo_url}
                    alt={`${org.display_name} Logo`}
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded"
                  />
                ) : (
                  <div className="h-4 w-4 rounded bg-muted" />
                )}
                <span className="flex-1 truncate text-left">
                  {org.display_name || org.name}
                </span>
                {org.isCurrent && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
