'use client';

/**
 * Topic Manager Component
 * 
 * Admin interface for managing topics with CRUD operations,
 * search, filtering, and bulk actions.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Upload,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Topic {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TopicManagerProps {
  initialTopics: Topic[];
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopicManager({ initialTopics }: TopicManagerProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  
  // Dialog states
  const [editDialog, setEditDialog] = useState<{ open: boolean; topic: Topic | null }>({
    open: false,
    topic: null,
  });
  const [createDialog, setCreateDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  
  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(topics.map(t => t.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [topics]);
  
  // Filter topics
  const filteredTopics = useMemo(() => {
    return topics.filter(topic => {
      // Search filter
      if (search && !topic.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Category filter
      if (categoryFilter !== 'all' && topic.category !== categoryFilter) {
        return false;
      }
      // Active filter
      if (!showInactive && !topic.isActive) {
        return false;
      }
      return true;
    });
  }, [topics, search, categoryFilter, showInactive]);
  
  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  
  const refreshTopics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/topics?includeInactive=true&limit=1000');
      const data = await res.json();
      setTopics(data.topics);
    } catch {
      toast.error('Failed to refresh topics');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreate = async (data: { name: string; category?: string; description?: string }) => {
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create topic');
      }
      
      toast.success('Topic created successfully');
      setCreateDialog(false);
      refreshTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create topic');
    }
  };
  
  const handleUpdate = async (id: string, data: Partial<Topic>) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update topic');
      }
      
      toast.success('Topic updated successfully');
      setEditDialog({ open: false, topic: null });
      refreshTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update topic');
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete topic');
      }
      
      toast.success('Topic deactivated');
      refreshTopics();
    } catch {
      toast.error('Failed to delete topic');
    }
  };
  
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to deactivate ${selectedIds.size} topics?`
    );
    if (!confirmed) return;
    
    try {
      const res = await fetch('/api/topics/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to delete topics');
      }
      
      toast.success(`Deactivated ${selectedIds.size} topics`);
      setSelectedIds(new Set());
      refreshTopics();
    } catch {
      toast.error('Failed to delete topics');
    }
  };
  
  const handleExport = () => {
    const csv = [
      ['name', 'category', 'description'],
      ...filteredTopics.map(t => [t.name, t.category || '', t.description || '']),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImport = async (csvText: string) => {
    const lines = csvText.trim().split('\n');
    const topics: { name: string; category?: string; description?: string }[] = [];
    
    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(/"([^"]*)"/g);
      if (match && match.length >= 1) {
        const name = match[0].replace(/"/g, '').trim();
        const category = match[1]?.replace(/"/g, '').trim();
        const description = match[2]?.replace(/"/g, '').trim();
        if (name) {
          topics.push({ name, category: category || undefined, description: description || undefined });
        }
      }
    }
    
    if (topics.length === 0) {
      toast.error('No valid topics found in CSV');
      return;
    }
    
    try {
      const res = await fetch('/api/topics/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topics }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import topics');
      }
      
      toast.success(`Imported ${data.imported} topics (${data.skipped} skipped)`);
      setImportDialog(false);
      refreshTopics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import topics');
    }
  };
  
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTopics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTopics.map(t => t.id)));
    }
  };
  
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };
  
  // ==========================================================================
  // RENDER
  // ==========================================================================
  
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshTopics}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Topic
          </Button>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {selectedIds.size} selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Deactivate Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}
      
      {/* Topics Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === filteredTopics.length && filteredTopics.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden md:table-cell">Description</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Usage</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTopics.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  No topics found
                </TableCell>
              </TableRow>
            ) : (
              filteredTopics.map(topic => (
                <TableRow key={topic.id} className={!topic.isActive ? 'opacity-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(topic.id)}
                      onCheckedChange={() => toggleSelect(topic.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{topic.name}</TableCell>
                  <TableCell>
                    {topic.category && (
                      <Badge variant="secondary">{topic.category}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-slate-500 text-sm max-w-xs truncate">
                    {topic.description || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={topic.isActive ? 'default' : 'outline'}>
                      {topic.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{topic.usageCount}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditDialog({ open: true, topic })}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(topic.id)}
                        disabled={!topic.isActive}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500">
          Showing {filteredTopics.length} of {topics.length} topics
        </div>
      </div>
      
      {/* Create Dialog */}
      <CreateTopicDialog
        open={createDialog}
        onOpenChange={setCreateDialog}
        onSubmit={handleCreate}
        categories={categories}
      />
      
      {/* Edit Dialog */}
      <EditTopicDialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, topic: open ? editDialog.topic : null })}
        topic={editDialog.topic}
        onSubmit={(data) => editDialog.topic && handleUpdate(editDialog.topic.id, data)}
        categories={categories}
      />
      
      {/* Import Dialog */}
      <ImportTopicsDialog
        open={importDialog}
        onOpenChange={setImportDialog}
        onImport={handleImport}
      />
    </div>
  );
}

// =============================================================================
// CREATE DIALOG
// =============================================================================

function CreateTopicDialog({
  open,
  onOpenChange,
  onSubmit,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; category?: string; description?: string }) => void;
  categories: string[];
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit({
      name: name.trim(),
      category: category.trim() || undefined,
      description: description.trim() || undefined,
    });
    setIsSubmitting(false);
    setName('');
    setCategory('');
    setDescription('');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Topic</DialogTitle>
          <DialogDescription>
            Add a new topic for speakers, talks, and events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cloud Security"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Infrastructure Security"
              list="categories"
            />
            <datalist id="categories">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the topic"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Topic
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// EDIT DIALOG
// =============================================================================

function EditTopicDialog({
  open,
  onOpenChange,
  topic,
  onSubmit,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: Topic | null;
  onSubmit: (data: Partial<Topic>) => void;
  categories: string[];
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Update form when topic changes
  useState(() => {
    if (topic) {
      setName(topic.name);
      setCategory(topic.category || '');
      setDescription(topic.description || '');
      setIsActive(topic.isActive);
    }
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    await onSubmit({
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      isActive,
    });
    setIsSubmitting(false);
  };
  
  // Reset form when dialog opens
  if (open && topic && name !== topic.name) {
    setName(topic.name);
    setCategory(topic.category || '');
    setDescription(topic.description || '');
    setIsActive(topic.isActive);
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Topic</DialogTitle>
          <DialogDescription>
            Update topic details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-category">Category</Label>
            <Input
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="edit-categories"
            />
            <datalist id="edit-categories">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="edit-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="edit-active">Active</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// IMPORT DIALOG
// =============================================================================

function ImportTopicsDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (csv: string) => void;
}) {
  const [csvText, setCsvText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    
    setIsSubmitting(true);
    await onImport(csvText);
    setIsSubmitting(false);
    setCsvText('');
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Topics</DialogTitle>
          <DialogDescription>
            Upload a CSV file or paste CSV content. Format: name, category, description
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-text">Or Paste CSV Content</Label>
            <Textarea
              id="csv-text"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={'"name","category","description"\n"Cloud Security","Infrastructure Security","Securing cloud environments"'}
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!csvText.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Topics
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
