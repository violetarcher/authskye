'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle2, Mail, Loader2 } from 'lucide-react';

interface UserData {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  phone_verified?: boolean;
  picture?: string;
}

interface ProfileSummaryProps {
  initialUser: UserData;
}

export function ProfileSummary({ initialUser }: ProfileSummaryProps) {
  const [user, setUser] = useState<UserData>(initialUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch fresh user data from Auth0 on mount
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser({
              sub: data.user.user_id,
              name: data.user.name || data.user.username || data.user.nickname,
              email: data.user.email,
              email_verified: data.user.email_verified,
              phone_number: data.user.phone_number,
              phone_verified: data.user.phone_verified,
              picture: data.user.picture,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      {/* Header with gradient background */}
      <div className="relative bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-background px-6 pt-10 pb-8">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* Avatar with ring and verification badge */}
          <div className="relative">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name || 'User'}
                className="w-24 h-24 rounded-full ring-4 ring-white/50 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 ring-4 ring-white/50 shadow-xl flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            {/* Verification badge */}
            {user.email_verified && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1.5 ring-4 ring-background shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Name and email */}
          <div className="w-full space-y-1.5 px-2">
            <h3 className="text-xl font-bold break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {user.name || 'User'}
            </h3>
            <p className="text-sm text-muted-foreground break-words leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              {user.email || 'No email'}
            </p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Content */}
      <CardContent className="space-y-4 p-6">
        {loading && (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Refreshing...</span>
          </div>
        )}

        {/* User ID - Full display */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">User ID</label>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs font-mono break-all leading-relaxed">{user.sub?.split('|')[1]}</p>
          </div>
        </div>

        {/* Verification Status */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Verification Status</label>
          <div className="space-y-2">
            {/* Email verification */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-all">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email</span>
              </div>
              {user.email ? (
                user.email_verified ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                    Pending
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                  Not Set
                </Badge>
              )}
            </div>

            {/* Phone verification */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-all">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Phone</span>
              </div>
              {user.phone_number ? (
                user.phone_verified ? (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                    Pending
                  </Badge>
                )
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                  Not Set
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auth Provider</label>
          <div className="p-3 rounded-lg bg-muted/50 border border-border/50 flex items-center justify-center">
            <Badge variant="outline" className="text-sm font-semibold uppercase px-4 py-1">
              {user.sub?.split('|')[0]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
