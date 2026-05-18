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
import { AlertTriangle, Building2, Dog, Heart, Trophy, Calendar, Award, Shield, Star, PawPrint } from "lucide-react"

// Paw0 Dashboard Data
const kpiData = [
  { title: "Registered Dogs", value: "12", change: "+2 this year", icon: Dog, color: "text-[#003594]" },
  { title: "Health Records", value: "24", change: "All up to date", icon: Heart, color: "text-green-600" },
  { title: "Show Points", value: "847", change: "+125 this season", icon: Trophy, color: "text-amber-500" },
  { title: "Upcoming Events", value: "3", change: "Next: Regional Show", icon: Calendar, color: "text-purple-600" },
];

const recentRegistrations = [
  { id: "AKC-2024-8847", name: "Champion's Golden Legacy", breed: "Golden Retriever", status: "Registered" },
  { id: "AKC-2024-7732", name: "Midnight Storm Runner", breed: "German Shepherd", status: "Registered" },
  { id: "AKC-2024-6621", name: "Royal Blue Diamond", breed: "Labrador Retriever", status: "Pending" },
  { id: "AKC-2024-5510", name: "Starlight Serenade", breed: "Poodle", status: "Registered" },
  { id: "AKC-2024-4409", name: "Thunder's Echo", breed: "Boxer", status: "Registered" },
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003594]"></div>
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
            <PawPrint className="h-8 w-8 text-[#003594]" />
            <span className="text-2xl font-bold text-gray-900">Paw0</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-gray-700 hover:text-[#003594] font-medium">Breeds</a>
            <a href="#" className="text-gray-700 hover:text-[#003594] font-medium">Events</a>
            <a href="#" className="text-gray-700 hover:text-[#003594] font-medium">Resources</a>
            <Button asChild variant="outline" className="border-[#003594] text-[#003594] hover:bg-blue-50">
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
              Your trusted partner in<br />canine registration
            </h1>

            {/* CTA Box */}
            <Card className="max-w-xl mx-auto shadow-xl border-2 border-blue-100">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Manage your kennel or get started
                </h3>
                <div className="space-y-3">
                  <Button asChild size="lg" className="w-full h-14 text-lg bg-[#003594] hover:bg-[#002670]">
                    <a href="/api/auth/login">
                      Sign In to Your Account
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="w-full h-14 text-lg border-2">
                    <Link href="/organizations/signup">
                      <Building2 className="mr-2 h-5 w-5" />
                      Kennel Club Registration
                    </Link>
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  New breeder? Sign in to create your account
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
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Trusted Registry</h4>
              <p className="text-sm text-gray-600">Official breed documentation</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Star className="h-6 w-6 text-[#003594]" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Champion Pedigrees</h4>
              <p className="text-sm text-gray-600">Complete lineage tracking</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Health Verified</h4>
              <p className="text-sm text-gray-600">Certified health records</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#003594] text-blue-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PawPrint className="h-6 w-6 text-white" />
                <span className="text-xl font-bold text-white">Paw0</span>
              </div>
              <p className="text-sm">
                The premier canine registry platform.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Registry</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Register a Dog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Litter Registration</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Transfer Ownership</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Events</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Dog Shows</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Competitions</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Breed Standards</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Health Resources</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-blue-400 pt-8 text-center text-sm">
            <p>&copy; 2024 Paw0. All rights reserved.</p>
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
    autoApproveRegistrations: false,
    emailNotifications: false,
    smsAlerts: false,
    eventReminders: false,
  });

  const fetchMetadata = async () => {
    try {
      const response = await fetch('/api/user/metadata');
      if (response.ok) {
        const data = await response.json();
        const metadata = data.user_metadata || {};

        setPreferences({
          autoApproveRegistrations: metadata.auto_approve_registrations === true,
          emailNotifications: metadata.email_notifications === true,
          smsAlerts: metadata.sms_alerts === true,
          eventReminders: metadata.event_reminders === true,
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
      'auto_approve_registrations': 'autoApproveRegistrations',
      'email_notifications': 'emailNotifications',
      'sms_alerts': 'smsAlerts',
      'event_reminders': 'eventReminders',
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
        <h1 className="text-3xl font-bold">Kennel Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.name || user.email}! Manage your dogs, registrations, and events.
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
        {/* Recent Registrations */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
            <CardDescription>Your dogs and their registration status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registration #</TableHead>
                  <TableHead>Dog Name</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium font-mono text-sm">{reg.id}</TableCell>
                    <TableCell>{reg.name}</TableCell>
                    <TableCell>{reg.breed}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        reg.status === 'Pending' ? 'secondary' : 'default'
                      }>
                        {reg.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage your kennel account notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003594]"></div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoApproveRegistrations" className="text-sm font-medium">
                      Auto-Approve Registrations
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically approve pending registrations
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.autoApproveRegistrations ? 'text-[#003594]' : 'text-gray-400'}`}>
                      {preferences.autoApproveRegistrations ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="autoApproveRegistrations"
                      checked={preferences.autoApproveRegistrations}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('auto_approve_registrations', checked)}
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
                      Receive registration and event updates via email
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.emailNotifications ? 'text-[#003594]' : 'text-gray-400'}`}>
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
                    <Label htmlFor="smsAlerts" className="text-sm font-medium">
                      SMS Alerts
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive urgent event and deadline alerts via SMS
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.smsAlerts ? 'text-[#003594]' : 'text-gray-400'}`}>
                      {preferences.smsAlerts ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="smsAlerts"
                      checked={preferences.smsAlerts}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('sms_alerts', checked)}
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="eventReminders" className="text-sm font-medium">
                      Event Reminders
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Receive reminders for upcoming shows and deadlines
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${preferences.eventReminders ? 'text-[#003594]' : 'text-gray-400'}`}>
                      {preferences.eventReminders ? 'ON' : 'OFF'}
                    </span>
                    <Switch
                      id="eventReminders"
                      checked={preferences.eventReminders}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('event_reminders', checked)}
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
                    Your preferences are saved automatically when you make changes.
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
