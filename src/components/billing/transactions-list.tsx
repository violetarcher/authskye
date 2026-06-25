'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, DollarSign, Calendar, FileText, Eye, CreditCard, Receipt } from 'lucide-react';

interface Transaction {
  id: string;
  serviceDate: string;
  providerName: string;
  claimAmount: number;
  status: 'pending' | 'approved' | 'denied' | 'processing';
  submittedAt: string;
  description?: string;
}

interface TransactionsListProps {
  userId?: string;
}

export function TransactionsList({ userId }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching transactions...');
      const response = await fetch('/api/billing/list');
      console.log('Transactions response:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('Transactions data:', data);
        setTransactions(data.claims || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to fetch transactions:', response.status, errorData);
        setError(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setError('Network error - failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Paid</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      case 'processing':
        return <Badge className="bg-blue-600">Under Review</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <CreditCard className="w-8 h-8 text-red-500 mb-2" />
          <h3 className="text-sm font-medium mb-1 text-red-700">Error Loading Transactions</h3>
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <Button onClick={fetchTransactions} variant="outline" size="sm" className="h-7">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Claims History
          </CardTitle>
          <CardDescription className="text-xs">Your submitted claims will appear here</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6 text-center">
          <CreditCard className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground mb-2">No claims submitted yet</p>
          <Button onClick={fetchTransactions} variant="outline" size="sm" className="h-7">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              Claims History
            </CardTitle>
            <CardDescription className="text-xs">{transactions.length} claim(s)</CardDescription>
          </div>
          <Button onClick={fetchTransactions} variant="outline" size="sm" disabled={loading} className="h-7 text-xs">
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {transactions.map((txn) => (
          <div key={txn.id} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-primary" />
                  {txn.providerName}
                </p>
                <p className="text-xs text-muted-foreground">
                  #{txn.id.substring(0, 8).toUpperCase()}
                </p>
              </div>
              {getStatusBadge(txn.status)}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Service Date</p>
                <p className="font-medium">{new Date(txn.serviceDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-medium">${txn.claimAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Filed</p>
                <p className="font-medium">{new Date(txn.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            </div>

            {txn.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{txn.description}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
