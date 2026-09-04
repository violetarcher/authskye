'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose
} from '@/components/ui/dialog';
import { toast } from "sonner";
// import { MoreHorizontal } from 'lucide-react';

// Type definitions
type Report = {
  id: string;
  title: string;
  amount: number;
  author: string;
  createdAt: string;
};

interface ReportDashboardProps {
  permissions: string[];
}

export function ReportDashboard({ permissions }: ReportDashboardProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<Partial<Report> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const fetchReports = async () => {
    const response = await fetch('/api/reports');
    if (response.ok) {
      setReports(await response.json());
    }
  };

  useEffect(() => {
    fetchReports();

    // Check for our explicit 'stepup_complete' parameter to trigger post-MFA actions
    if (searchParams?.get('stepup_complete') === 'true') {
      const action = sessionStorage.getItem('post_stepup_action');
      if (action) {
        const { actionType, reportId, reportTitle } = JSON.parse(action);
        if (actionType === 'delete' && reportId) {
          performDelete(reportId, reportTitle);
        }
        sessionStorage.removeItem('post_stepup_action');

        // Clean the URL by removing the query parameter
        router.replace('/reports', { scroll: false });
      }
    }
  }, [searchParams]);

  const handleCreate = () => {
    setCurrentReport({});
    setIsDialogOpen(true);
  };

  const handleEdit = (report: Report) => {
    setCurrentReport(report);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const reportData = {
      title: formData.get('title') as string,
      amount: Number(formData.get('amount')),
    };

    const url = currentReport?.id ? `/api/reports/${currentReport.id}` : '/api/reports';
    const method = currentReport?.id ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });

    if (response.ok) {
      toast.success(currentReport?.id ? "Expense Report Updated" : "Expense Report Created");
      setIsDialogOpen(false);
      fetchReports();
    } else {
      toast.error("Failed to save expense report.");
    }
  };

  const startDeleteFlow = (report: Report) => {
    if (confirm(`To delete expense report "${report.title}", you will need to re-authenticate for security.`)) {
      const action = { actionType: 'delete', reportId: report.id, reportTitle: report.title };
      sessionStorage.setItem('post_stepup_action', JSON.stringify(action));
      
      // Add the explicit parameter to the returnTo URL
      router.push('/api/auth/login?returnTo=/reports?stepup_complete=true&stepup=true');
    }
  };

  // for conditional for step up only if amr claim is missing
  // // 3. UPDATED: This function is now smarter
  // const startDeleteFlow = (report: any) => {
  //   // First, check if the user object is available and if they already have MFA in their session.
  //   // The 'amr' claim proves which authentication methods were used.
  //   if (user && user.amr && user.amr.includes('mfa')) {
  //     // If they have a recent MFA, they can delete directly
  //     if (confirm(`Are you sure you want to delete "${report.title}"?`)) {
  //       performDelete(report.id, report.title);
  //     }
  //   } else {
  //     // If not, send them through the step-up flow
  //     if (confirm(`To delete "${report.title}", you will need to re-authenticate for security.`)) {
  //       const action = { actionType: 'delete', reportId: report.id, reportTitle: report.title };
  //       sessionStorage.setItem('post_stepup_action', JSON.stringify(action));
  //       router.push('/api/auth/login?returnTo=/reports?stepup_complete=true&stepup=true');
  //     }
  //   }
  // };

  
  const performDelete = async (reportId: string, reportTitle: string) => {
  const response = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
  if (response.ok) {
    toast.success("Expense Report Deleted", { description: `"${reportTitle}" has been deleted.` });
    fetchReports();
  } else {
    const error = await response.json();
    // Corrected to use error.error
    toast.error("Failed to delete expense report.", { description: error?.error || 'An unknown error occurred.'});
  }
};

   return (
    <div>
      <div className="flex justify-end mb-4">
        {permissions.includes('create:reports') && (
          <Button onClick={handleCreate}>Create Expense Report</Button>
        )}
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow key={report.id}>
                <TableCell>{report.title}</TableCell>
                <TableCell>${report.amount.toFixed(2)}</TableCell>
                <TableCell>{report.author}</TableCell> {/* 2. Add Cell */}
                <TableCell className="text-right space-x-2">
                   {permissions.includes('edit:reports') && (
                    <Button variant="outline" size="sm" onClick={() => handleEdit(report)}>Edit</Button>
                  )}
                  {permissions.includes('delete:reports') && (
                    <Button variant="destructive" size="sm" onClick={() => startDeleteFlow(report)}>Delete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentReport?.id ? 'Edit Expense Report' : 'Create New Expense Report'}</DialogTitle>
            <DialogDescription>Fill in the details for the expense report.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">Title</Label>
                <Input id="title" name="title" defaultValue={currentReport?.title} className="col-span-3" required />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">Amount</Label>
                <Input id="amount" name="amount" type="number" defaultValue={currentReport?.amount} className="col-span-3" required />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}