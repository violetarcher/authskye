'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { ClaimSubmissionForm } from '@/components/claims/claim-submission-form';
import { ClaimsList } from '@/components/claims/claims-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Dog, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegistrationsPage() {
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const handleRegistrationSubmitted = () => {
    // Trigger re-render of registrations list by changing the key
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearAllRegistrations = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/claims/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error('Failed to clear registrations', {
          description: error.message || 'An error occurred',
        });
        return;
      }

      toast.success('All registrations cleared successfully');
      setRefreshTrigger(prev => prev + 1);
      setOpenClearDialog(false);
    } catch (error: any) {
      toast.error('Error clearing registrations', {
        description: error.message || 'An error occurred',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="mb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Dog className="w-8 h-8 text-[#003594]" />
          Dog Registration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register your dogs and track registration status
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column - Registration Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Submit Registration</CardTitle>
            <CardDescription className="text-xs">
              Complete the form below and approve via mobile push notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimSubmissionForm user={user} onClaimSubmitted={handleRegistrationSubmitted} />
          </CardContent>
        </Card>

        {/* Right column - Registrations List */}
        <div key={refreshTrigger}>
          <div className="flex flex-col gap-3">
            <ClaimsList userId={user?.sub || undefined} />
            <Dialog open={openClearDialog} onOpenChange={setOpenClearDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isClearing}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Registrations
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All Registrations?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All registrations in your account will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpenClearDialog(false)}
                    disabled={isClearing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleClearAllRegistrations}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Clear All Registrations'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
