// src/app/documents/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  FolderOpen,
  FileText,
  Plus,
  FolderPlus,
  Share2,
  Trash2,
  Edit
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { TupleInfoModal, TupleInfo } from '@/components/ui/tuple-info-modal';

interface Document {
  id: string;
  name: string;
  content?: string;
  parentId?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  canRead?: boolean;
  canWrite?: boolean;
  canShare?: boolean;
  canChangeOwner?: boolean;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDocDialogOpen, setCreateDocDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareType, setShareType] = useState<'document' | 'folder'>('document');
  const [shareTarget, setShareTarget] = useState<'user' | 'group'>('user');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareUserId, setShareUserId] = useState('');
  const [shareUserName, setShareUserName] = useState('');
  const [sharePermission, setSharePermission] = useState<'viewer' | 'owner'>('viewer');
  const [lookingUpUser, setLookingUpUser] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [viewDocumentDialogOpen, setViewDocumentDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [permissionDeniedDialogOpen, setPermissionDeniedDialogOpen] = useState(false);
  const [deniedDocumentName, setDeniedDocumentName] = useState('');
  const [tupleModalOpen, setTupleModalOpen] = useState(false);
  const [currentTupleInfo, setCurrentTupleInfo] = useState<TupleInfo | null>(null);

  // Get current folder ID from URL
  const currentFolderId = searchParams?.get('folder');

  // Navigate to a folder by updating the URL
  const navigateToFolder = (folderId: string | null) => {
    if (folderId) {
      router.push(`/documents?folder=${folderId}`);
    } else {
      router.push('/documents');
    }
  };

  useEffect(() => {
    if (!userLoading && user) {
      fetchDocuments();
      fetchFolders();
    }
  }, [user, userLoading]);

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents...');
      const response = await fetch('/api/documents');
      console.log('Documents response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Documents data:', data);
        setDocuments(data.documents || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch documents:', response.status, errorData);
        toast.error(`Failed to load documents: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Error loading documents. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      console.log('Fetching folders...');
      const response = await fetch('/api/folders');
      console.log('Folders response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Folders data:', data);
        setFolders(data.folders || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch folders:', response.status, errorData);
        toast.error(`Failed to load folders: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Error loading folders. Check console for details.');
    }
  };

  // Get breadcrumb path for current folder
  const getBreadcrumbs = () => {
    const breadcrumbs: { id: string | null; name: string }[] = [
      { id: null, name: 'Home' },
    ];

    if (currentFolderId) {
      let folderId: string | null = currentFolderId;
      const path: Folder[] = [];

      // Build path from current folder to root
      while (folderId) {
        const folder = folders.find((f) => f.id === folderId);
        if (folder) {
          path.unshift(folder);
          folderId = folder.parentId || null;
        } else {
          break;
        }
      }

      breadcrumbs.push(...path.map((f) => ({ id: f.id, name: f.name })));
    }

    return breadcrumbs;
  };

  // Filter items for current folder
  const currentFolders = folders.filter(
    (f) => (f.parentId || null) === currentFolderId
  );

  // Filter documents for current folder
  // Special handling: if viewing root (currentFolderId === null), also show documents
  // whose parent folder the user doesn't have access to (orphaned documents)
  const currentDocuments = documents.filter((d) => {
    const docParentId = d.parentId || null;

    // If document's parent matches current folder, show it
    if (docParentId === currentFolderId) {
      return true;
    }

    // If viewing root level and document has a parent folder
    if (currentFolderId === null && docParentId !== null) {
      // Check if user has access to the parent folder
      const parentFolder = folders.find((f) => f.id === docParentId);
      // If parent folder doesn't exist in user's accessible folders, show as orphaned document
      return !parentFolder;
    }

    return false;
  });

  const createDocument = async () => {
    if (!newDocName.trim()) {
      toast.error('Document name is required');
      return;
    }

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDocName,
          content: newDocContent,
          parentId: currentFolderId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments([...documents, data.document]);
        setCreateDocDialogOpen(false);
        setNewDocName('');
        setNewDocContent('');
        toast.success('Document created successfully');

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
        const error = await response.json();
        toast.error(error.error || 'Failed to create document');
      }
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Folder name is required');
      return;
    }

    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setFolders([...folders, data.folder]);
        setCreateFolderDialogOpen(false);
        setNewFolderName('');
        toast.success('Folder created successfully');

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
        const error = await response.json();
        toast.error(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(documents.filter(doc => doc.id !== docId));
        toast.success('Document deleted successfully');

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
        const error = await response.json();
        toast.error(error.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder?')) {
      return;
    }

    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(folders.filter(folder => folder.id !== folderId));
        toast.success('Folder deleted successfully');

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
        const error = await response.json();
        toast.error(error.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/groups');
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const openShareDialog = (itemId: string, type: 'document' | 'folder') => {
    setShareType(type);
    if (type === 'document') {
      setSelectedDocId(itemId);
      setSelectedFolderId(null);
    } else {
      setSelectedFolderId(itemId);
      setSelectedDocId(null);
    }
    setShareEmail('');
    setShareUserId('');
    setShareUserName('');
    setShareTarget('user');
    setSelectedGroupId('');
    setSharePermission('viewer');
    setShareDialogOpen(true);

    // Fetch groups if sharing a folder (groups can only be shared with folders)
    if (type === 'folder') {
      fetchGroups();
    }
  };

  const lookupUser = async () => {
    if (!shareEmail.trim()) {
      toast.error('Email address is required');
      return;
    }

    setLookingUpUser(true);
    try {
      const response = await fetch(`/api/users/lookup?email=${encodeURIComponent(shareEmail)}`);

      if (response.ok) {
        const data = await response.json();
        setShareUserId(data.user_id);
        setShareUserName(data.name || data.email);
        toast.success(`Found user: ${data.name || data.email}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'User not found');
        setShareUserId('');
        setShareUserName('');
      }
    } catch (error) {
      console.error('Error looking up user:', error);
      toast.error('Failed to lookup user');
      setShareUserId('');
      setShareUserName('');
    } finally {
      setLookingUpUser(false);
    }
  };

  const viewDocument = async (doc: Document) => {
    setCheckingPermission(true);
    try {
      // Fetch document with permission check
      const response = await fetch(`/api/documents/${doc.id}`);

      if (response.ok) {
        const data = await response.json();
        setViewingDocument(data.document);
        setViewDocumentDialogOpen(true);
        toast.success('Document opened successfully');
      } else {
        // Show permission denied modal
        setDeniedDocumentName(doc.name);
        setPermissionDeniedDialogOpen(true);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Failed to open document');
    } finally {
      setCheckingPermission(false);
    }
  };

  const shareItem = async () => {
    const itemId = shareType === 'document' ? selectedDocId : selectedFolderId;
    if (!itemId) {
      return;
    }

    // Validation based on share target
    if (shareTarget === 'user' && !shareUserId) {
      toast.error('Please lookup the user first');
      return;
    }

    if (shareTarget === 'group' && !selectedGroupId) {
      toast.error('Please select a group');
      return;
    }

    try {
      let endpoint: string;
      let body: any;

      if (shareTarget === 'user') {
        endpoint = shareType === 'document'
          ? `/api/documents/${itemId}/share`
          : `/api/folders/${itemId}/share`;
        body = {
          userId: shareUserId,
          permission: sharePermission,
        };
      } else {
        // Sharing with group (only folders support this)
        endpoint = `/api/folders/${itemId}/share-group`;
        body = {
          groupId: selectedGroupId,
          permission: sharePermission,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setShareDialogOpen(false);
        const itemType = shareType === 'document' ? 'Document' : 'Folder';
        const targetName = shareTarget === 'user'
          ? shareUserName || shareEmail
          : groups.find(g => g.id === selectedGroupId)?.name || 'group';
        toast.success(`${itemType} shared with ${targetName}`);

        // Show tuple modal if tuple info is available
        if (data.tupleInfo) {
          setCurrentTupleInfo(data.tupleInfo);
          setTupleModalOpen(true);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || `Failed to share ${shareType}`);
      }
    } catch (error) {
      console.error(`Error sharing ${shareType}:`, error);
      toast.error(`Failed to share ${shareType}`);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Please log in to access documents</div>
      </div>
    );
  }

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCreateFolderDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button onClick={() => setCreateDocDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id || 'root'} className="flex items-center gap-2">
            {index > 0 && <span className="text-muted-foreground">/</span>}
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className={`hover:text-primary transition-colors ${
                index === breadcrumbs.length - 1
                  ? 'font-semibold text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Folders Section */}
      {currentFolders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentFolders.map((folder) => (
              <div
                key={folder.id}
                className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => navigateToFolder(folder.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <FolderOpen className="h-5 w-5 text-yellow-500" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{folder.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(folder.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openShareDialog(folder.id, 'folder')}
                      title="Share folder"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteFolder(folder.id)}
                      title="Delete folder"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Documents</h2>
        {currentDocuments.length === 0 && currentFolders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items here. Create a folder or document to get started.</p>
          </div>
        ) : currentDocuments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No documents in this folder.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentDocuments.map((doc) => (
              <div
                key={doc.id}
                className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                onClick={() => viewDocument(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="h-5 w-5 text-blue-500" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{doc.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openShareDialog(doc.id, 'document')}
                      title="Share document"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(doc.id)}
                      title="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Document Dialog */}
      <Dialog open={createDocDialogOpen} onOpenChange={setCreateDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Document</DialogTitle>
            <DialogDescription>
              Create a new document. You can add content and share it with others.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                placeholder="My Document"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-content">Content (optional)</Label>
              <Input
                id="doc-content"
                placeholder="Document content..."
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDocDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderDialogOpen} onOpenChange={setCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="My Folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {shareType === 'document' ? 'Document' : 'Folder'}</DialogTitle>
            <DialogDescription>
              Share this {shareType} with {shareType === 'folder' ? 'users or groups' : 'users'} in your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Share Target Toggle (only for folders) */}
            {shareType === 'folder' && (
              <div className="space-y-2">
                <Label>Share With</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={shareTarget === 'user' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShareTarget('user')}
                    className="flex-1"
                  >
                    User
                  </Button>
                  <Button
                    type="button"
                    variant={shareTarget === 'group' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShareTarget('group')}
                    className="flex-1"
                  >
                    Group
                  </Button>
                </div>
              </div>
            )}

            {/* User Selection */}
            {shareTarget === 'user' && (
              <div className="space-y-2">
                <Label htmlFor="share-email">Email Address</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-email"
                    type="email"
                    placeholder="user@example.com"
                    value={shareEmail}
                    onChange={(e) => {
                      setShareEmail(e.target.value);
                      setShareUserId('');
                      setShareUserName('');
                    }}
                  />
                  <Button
                    type="button"
                    onClick={lookupUser}
                    disabled={lookingUpUser || !shareEmail.trim()}
                  >
                    {lookingUpUser ? 'Looking up...' : 'Find User'}
                  </Button>
                </div>
                {shareUserId && (
                  <p className="text-sm text-green-600">
                    ✓ Found: {shareUserName}
                  </p>
                )}
              </div>
            )}

            {/* Group Selection */}
            {shareTarget === 'group' && (
              <div className="space-y-2">
                <Label htmlFor="share-group">Select Group</Label>
                <select
                  id="share-group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Choose a group...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {selectedGroupId && (
                  <p className="text-sm text-muted-foreground">
                    All members of this group will have access to the folder and its contents.
                  </p>
                )}
              </div>
            )}

            {/* Permission Level */}
            <div className="space-y-2">
              <Label htmlFor="share-permission">Permission Level</Label>
              <select
                id="share-permission"
                value={sharePermission}
                onChange={(e) => setSharePermission(e.target.value as 'viewer' | 'owner')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="viewer">Viewer (Read only)</option>
                <option value="owner">Owner (Full access)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={shareItem}
              disabled={
                shareTarget === 'user' ? !shareUserId : !selectedGroupId
              }
            >
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewDocumentDialogOpen} onOpenChange={setViewDocumentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingDocument?.name}</DialogTitle>
            <DialogDescription>
              Document details and permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">
                  {viewingDocument?.createdAt
                    ? new Date(viewingDocument.createdAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Modified</p>
                <p className="text-sm">
                  {viewingDocument?.updatedAt
                    ? new Date(viewingDocument.updatedAt).toLocaleString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Your Permissions</p>
              <div className="flex gap-2">
                {viewingDocument?.canRead && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Can Read
                  </span>
                )}
                {viewingDocument?.canWrite && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Can Write
                  </span>
                )}
                {viewingDocument?.canShare && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Can Share
                  </span>
                )}
                {viewingDocument?.canChangeOwner && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Owner
                  </span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Content</p>
              <div className="border rounded-lg p-4 bg-muted/50 min-h-[200px]">
                <p className="text-sm whitespace-pre-wrap">
                  {viewingDocument?.content || 'No content'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Access granted</p>
                <p className="text-xs text-green-700">You have permission to view this document</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewDocumentDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Denied Dialog */}
      <Dialog open={permissionDeniedDialogOpen} onOpenChange={setPermissionDeniedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Access Denied</DialogTitle>
            <DialogDescription className="text-center">
              You don't have permission to view this document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-red-900 mb-1">
                    Permission Required
                  </h4>
                  <p className="text-sm text-red-800">
                    <span className="font-medium">{deniedDocumentName}</span> is protected. You need read access to view this document.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">What you can do:</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span>Contact the document owner to request access</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span>Ask a team member who has access to share it with you</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  <span>Check if you have the correct organizational permissions</span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <div className="flex items-start gap-2">
                <svg
                  className="h-5 w-5 text-blue-600 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xs text-blue-800">
                  This document is protected by Auth0 Fine-Grained Authorization (FGA). Access permissions are enforced at the API level.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setPermissionDeniedDialogOpen(false)} className="w-full">
              I Understand
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
    </div>
  );
}
