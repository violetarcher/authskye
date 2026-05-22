// src/app/admin/sessions/page.tsx
import { withPageAuthRequired, getSession } from '@auth0/nextjs-auth0';
import { SessionManagement } from '../../../components/admin/session-management';
import { getClaimKey } from '@/lib/auth-utils';

// Helper function to check for admin role
const isAdmin = (session: any): boolean => {
    const roles = session?.user?.[getClaimKey('roles')] || [];
    return roles.includes('Admin');
};

async function SessionsPage() {
    const session = await getSession();
    
    if (!isAdmin(session)) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-red-600">Access Denied</h1>
                    <p className="text-muted-foreground">
                        You must be an administrator to view session management.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Session Management</h1>
                <p className="text-muted-foreground">
                    Monitor and manage your active authentication sessions. Prevent account sharing by enforcing single session limits.
                </p>
            </div>
            
            <SessionManagement />
        </div>
    );
}

export default withPageAuthRequired(SessionsPage, { returnTo: '/admin/sessions' });