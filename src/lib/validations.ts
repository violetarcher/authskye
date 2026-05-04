import { z } from 'zod';

// Organization member schemas
export const memberIdSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required'),
});

export const updateMemberRolesSchema = z.object({
  roles: z.array(z.string()).min(1, 'At least one role is required').optional(),
  roleIds: z.array(z.string()).min(1, 'At least one role is required').optional(),
}).refine(
  (data) => data.roles || data.roleIds,
  { message: 'Either roles or roleIds must be provided' }
);

export const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  roles: z.array(z.string()).optional(),
  app_metadata: z.object({
    portal_user: z.boolean().optional(),
    read_only_access: z.boolean().optional(),
    read_write_access: z.boolean().optional(),
    system_configuration_privileges: z.boolean().optional(),
  }).optional(),
});

// Session management schemas
export const sessionIdSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const enforceSessionLimitSchema = z.object({
  maxSessions: z.number().min(1).max(10),
});

// Report schemas
export const reportIdSchema = z.object({
  reportId: z.string().min(1, 'Report ID is required'),
});

export const createReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  amount: z.number().min(0, 'Amount must be positive'),
});

export const updateReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100).optional(),
  amount: z.number().min(0, 'Amount must be positive').optional(),
});

// Access request schema
export const accessRequestSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

// Document management schemas
export const createDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  content: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().min(0).optional(),
  parentId: z.string().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  content: z.string().optional(),
  parentId: z.string().nullable().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  parentId: z.string().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  parentId: z.string().nullable().optional(),
});

export const shareDocumentSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permission: z.enum(['viewer', 'owner']),
});

export const shareFolderSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permission: z.enum(['viewer', 'owner']),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  description: z.string().max(500).optional(),
});

export const addGroupMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const shareFolderWithGroupSchema = z.object({
  groupId: z.string().min(1, 'Group ID is required'),
  permission: z.enum(['viewer', 'owner']),
});

// MFA management schemas
export const mfaMethodIdSchema = z.object({
  methodId: z.string().min(1, 'Method ID is required'),
});

export const enrollMfaFactorSchema = z.object({
  type: z.enum([
    'sms',
    'phone',
    'email',
    'totp',
    'push-notification',
    'passkey',
    // 'webauthn-roaming',    // Not yet supported - hiding for now
    // 'webauthn-platform'    // Not yet supported - hiding for now
  ]),
  phoneNumber: z.string().optional(),
  email: z.string().email('Valid email is required').optional(),
  name: z.string().max(100, 'Name must be less than 100 characters').optional(),
  // Passkey-specific fields for identity linkage
  connection: z.string().optional(),
  identity_user_id: z.string().optional(),
}).refine(
  (data) => {
    // Phone number required for SMS/phone factors
    if ((data.type === 'sms' || data.type === 'phone') && !data.phoneNumber) {
      return false;
    }
    // Email required for email factors
    if (data.type === 'email' && !data.email) {
      return false;
    }
    return true;
  },
  {
    message: 'Phone number required for SMS/phone factors, email required for email factors',
    path: ['phoneNumber']
  }
);

export const updateMfaMethodSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  preferred: z.boolean().optional(),
});

// Organization signup and management schemas
export const organizationSignupSchema = z.object({
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(100, 'Organization name must be less than 100 characters'),
  adminEmail: z.string().email('Valid email is required'),
});

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100).optional(),
  display_name: z.string().min(2).max(100).optional(),
  logo_url: z.union([z.string().url('Valid URL is required'), z.literal('')]).optional(),
  website: z.union([z.string().url('Valid URL is required'), z.literal('')]).optional(),
  industry: z.string().max(100).optional(),
});

export const claimDomainSchema = z.object({
  domain: z.string()
    .toLowerCase()
    .regex(
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/,
      'Invalid domain format'
    ),
});

export const ssoTicketSchema = z.object({
  returnUrl: z.string().url('Valid return URL is required').optional(),
});