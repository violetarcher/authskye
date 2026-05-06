'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { ClaimSubmissionForm } from '@/components/claims/claim-submission-form';
import { ClaimsList } from '@/components/claims/claims-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Zap, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingPage() {
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const handleBillSubmitted = () => {
    // Trigger re-render of bills list by changing the key
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearAllBills = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/claims/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error('Failed to clear bills', {
          description: error.message || 'An error occurred',
        });
        return;
      }

      toast.success('All bills cleared successfully');
      setRefreshTrigger(prev => prev + 1);
      setOpenClearDialog(false);
    } catch (error: any) {
      toast.error('Error clearing bills', {
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
          <Zap className="w-8 h-8" />
          Billing Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Submit and track your utility bills and payments
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column - Bill Payment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Submit Payment Information</CardTitle>
            <CardDescription className="text-xs">
              Complete the form below and approve via mobile push notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimSubmissionForm user={user} onClaimSubmitted={handleBillSubmitted} />
          </CardContent>
        </Card>

        {/* Right column - Bills List */}
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
                  Clear All Bills
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All Bills?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All bills in your account will be permanently deleted.
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
                    onClick={handleClearAllBills}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Clear All Bills'}
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
