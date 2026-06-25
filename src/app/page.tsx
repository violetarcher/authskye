'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Building2, Cross, FileText, Activity, Users, HeartPulse, Shield, Lock, ClipboardList } from "lucide-react"

// BlueCrest Health Dashboard Data
const kpiData = [
  { title: "Active Claims", value: "3", change: "2 under review", icon: FileText, color: "text-blue-500" },
  { title: "Covered Members", value: "6", change: "Plan: BlueCrest PPO", icon: Users, color: "text-green-600" },
  { title: "In-Network Providers", value: "4,200+", change: "In your area", icon: HeartPulse, color: "text-purple-600" },
  { title: "Benefits Remaining", value: "$1,850", change: "of $2,000 deductible", icon: Activity, color: "text-amber-500" },
];

const recentActivity = [
  { id: "ACT-001", action: "Claim submitted", resource: "CLM-2024-003 — CareNow Urgent Care", status: "Pending", time: "2 min ago" },
  { id: "ACT-002", action: "EOB available", resource: "CLM-2024-001 — Dr. Sarah Martinez", status: "Completed", time: "1 hour ago" },
  { id: "ACT-003", action: "Prior auth approved", resource: "MRI — Pacific Imaging Center", status: "Completed", time: "Yesterday" },
  { id: "ACT-004", action: "Member added", resource: "Dependant: James Doe", status: "Active", time: "2 days ago" },
  { id: "ACT-005", action: "Benefits updated", resource: "2024 Plan Year renewal", status: "Completed", time: "3 days ago" },
];

export default function HomePage() {
  const { user, error, isLoading } = useUser();

  // Handle invitation flow - redirect to login with invitation params
  useEffect(() => {
    if (!isLoading && !user && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const invitation = params.get('invitation');
      const organization = params.get('organization');

      if (invitation && organization) {
        window.location.href = `/api/auth/login?invitation=${invitation}&organization=${organization}`;
      }
    }
  }, [isLoading, user]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Authentication error: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Not logged in - show welcome/login page
  if (!user) {
    return <WelcomePage />;
  }

  // User is logged in - show dashboard
  return <Dashboard user={user} />;
}

function WelcomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center">
              <Cross className="h-4 w-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">BlueCrest Health</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Coverage</a>
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Providers</a>
            <a href="#" className="text-gray-700 hover:text-primary font-medium">Member Resources</a>
            <Button asChild variant="outline" className="border-primary text-primary hover:bg-blue-50">
              <a href="/api/auth/login">Sign In</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Your health coverage,<br />simplified
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Submit claims, manage benefits, and access your care team securely through the BlueCrest Health member portal.
            </p>

            {/* CTA Box */}
            <Card className="max-w-xl mx-auto shadow-xl border-2 border-blue-100">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Access your member portal
                </h3>
                <div className="space-y-3">
                  <Button asChild size="lg" className="w-full h-14 text-lg">
                    <a href="/api/auth/login">
                      Sign In to Member Portal
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full h-14 text-lg border-2">
                    <Link href="/organizations/signup">
                      <Building2 className="mr-2 h-5 w-5" />
                      Register Your Organization
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  HIPAA-compliant. Your health data is protected.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-white border-y py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">HIPAA-Compliant Security</h4>
              <p className="text-sm text-gray-600">End-to-end encryption with push-based claim approval</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Claims Management</h4>
              <p className="text-sm text-gray-600">Submit claims and track EOBs in real time</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Lock className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Fine-Grained Access</h4>
              <p className="text-sm text-gray-600">Role-based access for members, providers, and admins</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center">
                  <Cross className="h-3 w-3 text-white" />
                </div>
                <span className="text-xl font-bold text-white">BlueCrest Health</span>
              </div>
              <p className="text-sm">
                Your health coverage, simplified.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Members</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Coverage &amp; Benefits</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Find a Provider</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Submit a Claim</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Member Handbook</a></li>
                <li><a href="#" className="hover:text-white transition-colors">FAQs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-8 text-center text-sm">
            <p>&copy; 2026 BlueCrest Health. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Dashboard({ user }: { user: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [preferences, setPreferences] = useState({
    autoSync: false,
    emailNotifications: false,
    securityAlerts: false,
    usageReports: false,
  });

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/user/metadata');
      if (response.ok) {
        const data = await response.json();
        const metadata = data.user_metadata || {};

        setPreferences({
          autoSync: metadata.auto_sync === true,
          emailNotifications: metadata.email_notifications === true,
          securityAlerts: metadata.security_alerts === true,
          usageReports: metadata.usage_reports === true,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user metadata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handlePreferenceChange = async (key: string, value: boolean) => {
    const keyMap: { [key: string]: keyof typeof preferences } = {
      'auto_sync': 'autoSync',
      'email_notifications': 'emailNotifications',
      'security_alerts': 'securityAlerts',
      'usage_reports': 'usageReports',
    };

    const frontendKey = keyMap[key];

    setPreferences(prev => ({
      ...prev,
      [frontendKey]: value,
    }));

    setIsSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [key]: value,
        }),
      });

      if (response.ok) {
        await fetchMetadata();
        setSaveMessage('Preferences saved successfully!');
      } else {
        setSaveMessage('Failed to save preferences. Please try again.');
        setPreferences(prev => ({
          ...prev,
          [frontendKey]: !value,
        }));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      setSaveMessage('Error saving preferences. Please try again.');
      setPreferences(prev => ({
        ...prev,
        [frontendKey]: !value,
      }));
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || user.email}! Here's a summary of your coverage and recent activity.
        </p>
      </header>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Activity */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium">{activity.action}</TableCell>
                    <TableCell className="text-muted-foreground">{activity.resource}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{activity.time}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        activity.status === 'Active' ? 'secondary' : 'default'
                      }>
                        {activity.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Manage your member notification settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoSync" className="text-sm font-medium">
                      Push Claim Approvals
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive push notifications for claim submissions
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.autoSync ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.autoSync ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="autoSync"
                      checked={preferences.autoSync}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('auto_sync', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications" className="text-sm font-medium">
                      Email Notifications
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive claim status updates and EOBs by email
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.emailNotifications ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.emailNotifications ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="emailNotifications"
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('email_notifications', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="securityAlerts" className="text-sm font-medium">
                      Security Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified of suspicious activity
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.securityAlerts ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.securityAlerts ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="securityAlerts"
                      checked={preferences.securityAlerts}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('security_alerts', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="usageReports" className="text-sm font-medium">
                      Benefits Summaries
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive monthly benefits and deductible summaries
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.usageReports ? 'text-primary' : 'text-gray-400'}`}>
                      {preferences.usageReports ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="usageReports"
                      checked={preferences.usageReports}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('usage_reports', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                {saveMessage && (
                  <Alert className={saveMessage.includes('success') ? 'border-green-500' : 'border-red-500'}>
                    <AlertDescription>{saveMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Notification preferences are saved automatically.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
