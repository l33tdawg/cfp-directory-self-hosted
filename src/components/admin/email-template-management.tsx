'use client';

/**
 * Email Template Management Component
 * 
 * Manages email templates with editing, preview, and testing capabilities.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { EmailTemplateEditor } from '@/components/editors/email-template-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Edit2,
  Eye,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Users,
  Megaphone,
  Key,
} from 'lucide-react';
import {
  EMAIL_TEMPLATE_CATEGORY_LABELS,
  type EmailTemplateCategory,
} from '@/types/email-templates';

interface EmailTemplate {
  id: string;
  type: string;
  name: string;
  subject: string;
  content: string;
  variables: Record<string, string>;
  description: string | null;
  category: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface EmailTemplateManagementProps {
  initialTemplates: EmailTemplate[];
  templatesByCategory?: Record<string, EmailTemplate[]>;
  stats: {
    total: number;
    enabled: number;
    disabled: number;
    categories: number;
  };
}

const categoryIcons: Record<string, React.ReactNode> = {
  authentication: <Key className="h-4 w-4" />,
  submissions: <FileText className="h-4 w-4" />,
  communication: <Users className="h-4 w-4" />,
  announcements: <Megaphone className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  authentication: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  submissions: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  communication: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  announcements: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
};

export function EmailTemplateManagement({
  initialTemplates,
  stats,
}: EmailTemplateManagementProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    enabled: true,
  });

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const handleEdit = (template: EmailTemplate) => {
    setFormData({
      subject: template.subject,
      content: template.content,
      enabled: template.enabled,
    });
    setEditingTemplate(template);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${editingTemplate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const updated = await res.json();
      
      // Update local state
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id ? { ...t, ...updated } : t
      ));

      toast.success('Template saved');
      setEditingTemplate(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !template.enabled }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setTemplates(prev => prev.map(t => 
        t.id === template.id ? { ...t, enabled: !template.enabled } : t
      ));

      toast.success(template.enabled ? 'Template disabled' : 'Template enabled');
    } catch {
      toast.error('Failed to update template');
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    setPreviewTemplate(template);
    setPreviewHtml('');
    setPreviewSubject('');

    try {
      const res = await fetch('/api/admin/email-templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html);
        setPreviewSubject(data.subject);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  };

  const handleSendTest = async () => {
    if (!previewTemplate || !testEmail) return;

    setSendingTest(true);
    try {
      const res = await fetch('/api/admin/email-templates/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: previewTemplate.id,
          toEmail: testEmail,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Test email sent to ${testEmail}`);
        setTestEmail('');
      } else {
        toast.error(data.error || 'Failed to send');
      }
    } catch {
      toast.error('Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <Mail className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-slate-500">Templates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enabled}</p>
                <p className="text-sm text-slate-500">Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
                <XCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.disabled}</p>
                <p className="text-sm text-slate-500">Disabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.categories}</p>
                <p className="text-sm text-slate-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="px-4">All</TabsTrigger>
          {Object.entries(EMAIL_TEMPLATE_CATEGORY_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="px-4 gap-2">
              {categoryIcons[key]}
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map(template => (
              <Card 
                key={template.id} 
                className={`transition-all ${!template.enabled ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-1">
                        {template.subject}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={template.enabled}
                      onCheckedChange={() => handleToggleEnabled(template)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Category Badge */}
                  <Badge 
                    variant="secondary" 
                    className={categoryColors[template.category] || ''}
                  >
                    {categoryIcons[template.category]}
                    <span className="ml-1">
                      {EMAIL_TEMPLATE_CATEGORY_LABELS[template.category as EmailTemplateCategory] || template.category}
                    </span>
                  </Badge>

                  {/* Description */}
                  {template.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Variables */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Variables:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(template.variables as Record<string, string>).slice(0, 4).map(v => (
                        <Badge key={v} variant="outline" className="text-xs">
                          {`{${v}}`}
                        </Badge>
                      ))}
                      {Object.keys(template.variables as Record<string, string>).length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{Object.keys(template.variables as Record<string, string>).length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No templates in this category
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
            <DialogDescription>
              {editingTemplate?.description || `Customize the ${editingTemplate?.name} email template`}
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-6 py-4">
              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Email subject..."
                />
                <p className="text-xs text-slate-500">
                  Use {'{'}variableName{'}'} to insert dynamic content
                </p>
              </div>

              {/* Content - Rich Text Editor */}
              <div className="space-y-2">
                <Label>Email Content</Label>
                <EmailTemplateEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  variables={editingTemplate.variables as Record<string, string>}
                  placeholder="Write your email content here..."
                />
                <p className="text-xs text-slate-500">
                  Use the toolbar to format text and insert variables. Variables like {'{userName}'} will be replaced with actual values when the email is sent.
                </p>
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Template Enabled</Label>
                  <p className="text-sm text-slate-500">
                    Disabled templates will not be sent
                  </p>
                </div>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview with sample data. Send a test to verify styling.
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="flex-1 min-h-0 space-y-4">
              {/* Subject Preview */}
              <div>
                <Label className="text-sm font-medium">Subject Line</Label>
                <div className="mt-1 p-3 bg-slate-100 dark:bg-slate-900 rounded-md font-medium text-sm">
                  {previewSubject || previewTemplate.subject}
                </div>
              </div>

              {/* Email Preview */}
              <div className="flex-1 min-h-0">
                <Label className="text-sm font-medium">Email Preview</Label>
                <div className="mt-1 border rounded-lg overflow-hidden h-[400px] bg-gray-50">
                  {previewHtml ? (
                    <iframe
                      srcDoc={previewHtml}
                      className="w-full h-full border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                      style={{ backgroundColor: 'white' }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Send Test */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium">Send Test Email</Label>
                <div className="mt-2 flex gap-3">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleSendTest}
                    disabled={sendingTest || !testEmail}
                  >
                    {sendingTest ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Test
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Requires SMTP to be configured in Settings
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
