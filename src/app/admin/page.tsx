// src/app/admin/page.tsx - Restored original admin dashboard
import { getSession, withPageAuthRequired } from "@auth0/nextjs-auth0";
import { managementClient } from "@/lib/auth0-mgmt-client";
import { MemberManager } from "@/components/admin/member-manager";
import { GroupManager } from "@/components/admin/group-manager";
import { getClaimKey } from '@/lib/auth-utils';

// Helper function to check for admin role
const isAdmin = (session: any): boolean => {
    const roles = session?.user?.[getClaimKey('roles')] || [];
    return roles.includes('Admin');
};

// This Server Component will fetch initial data
async function AdminPage() {
    const session = await getSession();
    if (!isAdmin(session)) {
        return (
            <div>
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You must be an administrator to view this page.</p>
            </div>
        );
    }
    
    const orgId = session?.user.org_id;
    if (!orgId) {
        return <div>Organization not found.</div>;
    }
    
    // 1. Fetch the initial list of members and all available roles
    const [membersRes, rolesRes] = await Promise.all([
        managementClient.organizations.getMembers({ id: orgId }),
        managementClient.roles.getAll(),
    ]);
    const initialMembers = membersRes.data;
    const availableRoles = rolesRes.data;
    
    // 2. For each member, create a promise to fetch their assigned roles
    const memberRolePromises = initialMembers.map(member => 
        managementClient.organizations.getMemberRoles({ id: orgId, user_id: member.user_id })
    );
    const memberRolesResults = await Promise.all(memberRolePromises);
    
    // 3. Combine the member data with their roles
    const membersWithRoles = initialMembers.map((member, index) => ({
        ...member,
        roles: memberRolesResults[index].data
    }));
    
    return (
        <div>
          <header className="mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage organization members, roles, and groups.</p>
          </header>
          <div className="space-y-8">
            <MemberManager initialMembers={membersWithRoles} availableRoles={availableRoles} />
            <GroupManager />
          </div>
        </div>
    );
}

// Wrap the page with the login protector
export default withPageAuthRequired(AdminPage, { returnTo: '/admin' });