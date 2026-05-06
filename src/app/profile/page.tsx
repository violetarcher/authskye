import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileClient } from '@/components/profile/profile-client';
import { ProfileSummary } from '@/components/profile/profile-summary';
import { User, Key, Shield, Lock, Settings } from 'lucide-react';

export default withPageAuthRequired(async function ProfilePage() {
  const session = await getSession();
  const user = session?.user;

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Unable to load user profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 px-2 sm:px-0">
      {/* Header */}
      <header className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile Management</h1>
        <p className="text-base sm:text-lg text-muted-foreground">
          Manage your account settings, security, and preferences
        </p>
      </header>

      {/* Profile Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="lg:col-span-1">
          <ProfileSummary initialUser={user as any} />
        </div>

        {/* Main Content - Tabs */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="overview" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline text-xs sm:text-sm">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="tokens" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2">
                <Key className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline text-xs sm:text-sm">Tokens</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline text-xs sm:text-sm">Security</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2">
                <Lock className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline text-xs sm:text-sm">Sessions</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2">
                <Settings className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline text-xs sm:text-sm">Preferences</span>
              </TabsTrigger>
            </TabsList>

            <ProfileClient user={user as any} />
          </Tabs>
        </div>
      </div>
    </div>
  );
}, { returnTo: '/profile' });
