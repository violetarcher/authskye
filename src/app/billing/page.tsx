'use client';

import { useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { BillingForm } from '@/components/billing/billing-form';
import { TransactionsList } from '@/components/billing/transactions-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingPage() {
  const { user } = useUser();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [openClearDialog, setOpenClearDialog] = useState(false);

  const handlePaymentSubmitted = () => {
    // Trigger re-render of transactions list by changing the key
    setRefreshTrigger(prev => prev + 1);
  };

  const handleClearAllTransactions = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('/api/billing/clear', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error('Failed to clear transactions', {
          description: error.message || 'An error occurred',
        });
        return;
      }

      toast.success('All transactions cleared successfully');
      setRefreshTrigger(prev => prev + 1);
      setOpenClearDialog(false);
    } catch (error: any) {
      toast.error('Error clearing transactions', {
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
          <CreditCard className="w-8 h-8 text-primary" />
          Billing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your payments and view transaction history
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left column - Payment Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Make a Payment</CardTitle>
            <CardDescription className="text-xs">
              Complete the form below and approve via mobile push notification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingForm user={user} onPaymentSubmitted={handlePaymentSubmitted} />
          </CardContent>
        </Card>

        {/* Right column - Transactions List */}
        <div key={refreshTrigger}>
          <div className="flex flex-col gap-3">
            <TransactionsList userId={user?.sub || undefined} />
            <Dialog open={openClearDialog} onOpenChange={setOpenClearDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  disabled={isClearing}
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All Transactions
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All Transactions?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. All transactions in your account will be permanently deleted.
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
                    onClick={handleClearAllTransactions}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Clear All Transactions'}
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
