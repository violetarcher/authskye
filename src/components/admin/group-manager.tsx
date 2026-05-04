// src/components/admin/group-manager.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { Group, GroupMember } from '@/types/groups';
import { Textarea } from '@/components/ui/textarea';
import { TupleInfoModal, TupleInfo } from '@/components/ui/tuple-info-modal';

export function GroupManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [lookingUpUser, setLookingUpUser] = useState(false);
  const [tupleModalOpen, setTupleModalOpen] = useState(false);
  const [currentTupleInfo, setCurrentTupleInfo] = useState<TupleInfo | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      } else {
        toast.error('Failed to load groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`);
      if (response.ok) {
        const data = await response.json();
        setGroupMembers(data.members);
      } else {
        toast.error('Failed to load group members');
      }
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('Failed to load group members');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroups([data.group, ...groups]);
        setNewGroupName('');
        setNewGroupDescription('');
        setCreateDialogOpen(false);
        toast.success('Group created successfully');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? All members will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(groups.filter((g) => g.id !== groupId));
        if (selectedGroup?.id === groupId) {
          setSelectedGroup(null);
          setGroupMembers([]);
        }
        toast.success('Group deleted successfully');

        // Show tuple modal if tuple info is available
        if (data.tupleInfo && Array.isArray(data.tupleInfo)) {
          // Show each tuple one at a time
          for (const tuple of data.tupleInfo) {
            setCurrentTupleInfo(tuple);
            setTupleModalOpen(true);
            // Wait a bit before showing the next one (user needs to close the first one)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete group');
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const handleAddMember = async () => {
    if (!memberEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!selectedGroup) {
      toast.error('No group selected');
      return;
    }

    try {
      setLookingUpUser(true);

      // First, lookup the user by email
      const lookupResponse = await fetch(
        `/api/users/lookup?email=${encodeURIComponent(memberEmail)}`
      );

      if (!lookupResponse.ok) {
        toast.error('User not found in organization');
        return;
      }

      const userData = await lookupResponse.json();

      // Add the user to the group
      const addResponse = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user_id,
        }),
      });

      if (addResponse.ok) {
        const data = await addResponse.json();
        await fetchGroupMembers(selectedGroup.id);
        setMemberEmail('');
        setAddMemberDialogOpen(false);
        toast.success('Member added to group');

        // Show tuple modal if tuple info is available
        if (data.tupleInfo) {
          setCurrentTupleInfo(data.tupleInfo);
          setTupleModalOpen(true);
        }
      } else {
        const data = await addResponse.json();
        toast.error(data.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    } finally {
      setLookingUpUser(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedGroup) return;

    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const data = await response.json();
        setGroupMembers(groupMembers.filter((m) => m.userId !== userId));
        toast.success('Member removed from group');

        // Show tuple modal if tuple info is available
        if (data.tupleInfo) {
          setCurrentTupleInfo(data.tupleInfo);
          setTupleModalOpen(true);
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
          <CardDescription>Manage groups and their members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Groups</CardTitle>
              <CardDescription>Manage groups and their members</CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              Create Group
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No groups yet</p>
              <p className="text-sm">Create a group to organize users and assign permissions</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Group Name
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Members
                    </th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                      Created
                    </th>
                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((group) => (
                    <tr
                      key={group.id}
                      className={`border-b transition-colors hover:bg-muted/50 cursor-pointer ${
                        selectedGroup?.id === group.id ? 'bg-muted/50' : ''
                      }`}
                      onClick={() => setSelectedGroup(group)}
                    >
                      <td className="p-4 align-middle font-medium">
                        {group.name}
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground">
                        {group.description || '—'}
                      </td>
                      <td className="p-4 align-middle">
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                          {groupMembers.length > 0 && selectedGroup?.id === group.id
                            ? groupMembers.length
                            : '—'}
                        </span>
                      </td>
                      <td className="p-4 align-middle text-sm text-muted-foreground">
                        {new Date(group.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Group Members Section */}
          {selectedGroup && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Members of {selectedGroup.name}
                </h3>
                <Button
                  onClick={() => setAddMemberDialogOpen(true)}
                >
                  Add Member
                </Button>
              </div>

              {groupMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-md">
                  <p>No members in this group yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                          Email
                        </th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map((member) => (
                        <tr key={member.userId} className="border-b transition-colors hover:bg-muted/50">
                          <td className="p-4 align-middle font-medium">
                            {member.name || '—'}
                          </td>
                          <td className="p-4 align-middle text-sm text-muted-foreground">
                            {member.email}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize users and assign permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g., Engineering Team"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Describe the purpose of this group"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Enter the email address of an organization member to add them to this group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="memberEmail">Member Email</Label>
              <Input
                id="memberEmail"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddMemberDialogOpen(false)}
              disabled={lookingUpUser}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={lookingUpUser}>
              {lookingUpUser ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tuple Info Modal */}
      <TupleInfoModal
        isOpen={tupleModalOpen}
        tupleInfo={currentTupleInfo}
        onClose={() => {
          setTupleModalOpen(false);
          setCurrentTupleInfo(null);
        }}
      />
    </>
  );
}
