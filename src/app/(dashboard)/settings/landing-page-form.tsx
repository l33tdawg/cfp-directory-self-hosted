'use client';

/**
 * Landing Page Settings Form
 * 
 * Rich text editor and section manager for customizing the landing page.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RichTextEditor, RichTextContent } from '@/components/ui/rich-text-editor';
import { 
  LandingPageSectionManager, 
  mergeSectionsWithDefaults, 
  sectionsToJson,
  type LandingPageSection,
} from '@/components/settings/landing-page-section-manager';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Loader2, Eye, Edit3, LayoutGrid } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface LandingPageFormProps {
  currentContent: string | null;
  currentSections: object[] | null;
}

const DEFAULT_CONTENT = `<h1>Welcome to Our Conference</h1>
<p>Browse our events and submit your talk proposals. Create an account to track your submissions and get updates on your speaking opportunities.</p>
<h2>Why Submit to Us?</h2>
<ul>
  <li><strong>Expert Review:</strong> Every submission is reviewed by industry experts</li>
  <li><strong>Great Audience:</strong> Reach hundreds of engaged attendees</li>
  <li><strong>Speaker Support:</strong> We provide speaker coaching and support</li>
</ul>
<p>Ready to share your knowledge? Browse our open CFPs below and submit your talk today!</p>`;

export function LandingPageForm({ currentContent, currentSections }: LandingPageFormProps) {
  const router = useRouter();
  const api = useApi();
  const [content, setContent] = useState(currentContent || '');
  const [sections, setSections] = useState<LandingPageSection[]>(
    mergeSectionsWithDefaults(currentSections as Partial<LandingPageSection>[] | null)
  );
  const [activeTab, setActiveTab] = useState<'content' | 'layout' | 'preview'>('content');

  const handleSubmit = async () => {
    const { error } = await api.patch('/api/settings', {
      landingPageContent: content,
      landingPageSections: sectionsToJson(sections),
    });

    if (error) {
      return;
    }

    toast.success('Landing page settings saved');
    router.refresh();
  };

  const handleResetContent = () => {
    if (confirm('Reset to default content? This will replace your current content.')) {
      setContent(DEFAULT_CONTENT);
    }
  };

  const handleResetLayout = () => {
    if (confirm('Reset to default layout? This will restore default section order and visibility.')) {
      setSections(mergeSectionsWithDefaults(null));
    }
  };

  // Get enabled sections in order for preview
  const enabledSections = sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Customize your landing page content and layout. Edit the hero content, reorder sections,
          and choose which sections to display to visitors.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'content' | 'layout' | 'preview')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Hero Content</h3>
                <p className="text-sm text-slate-500">Main content displayed at the top of your landing page</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleResetContent}>
                Reset to Default
              </Button>
            </div>
            
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Enter your landing page content..."
              className="min-h-[350px]"
            />
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white">Section Layout</h3>
                <p className="text-sm text-slate-500">Drag to reorder, toggle to show/hide sections</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleResetLayout}>
                Reset to Default
              </Button>
            </div>
            
            <LandingPageSectionManager
              sections={sections}
              onChange={setSections}
            />
          </div>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="mt-6">
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 uppercase tracking-wider">Preview</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-1">
                Landing Page Preview
              </h3>
              <p className="text-sm text-slate-500">
                Sections will appear in this order: {enabledSections.map(s => s.name).join(' → ')}
              </p>
            </div>
            
            <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto">
              {enabledSections.map((section) => (
                <div key={section.id} className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                  {section.id === 'hero' && (
                    <div className="max-w-3xl">
                      {content ? (
                        <RichTextContent content={content} />
                      ) : (
                        <div className="text-slate-400 italic">
                          [Hero Content - Edit in Content tab]
                        </div>
                      )}
                    </div>
                  )}
                  
                  {section.id === 'open-cfps' && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                          Open for Submissions
                        </h3>
                      </div>
                      <div className="text-slate-500 text-sm italic">
                        [Events with open CFPs will appear here]
                      </div>
                    </div>
                  )}
                  
                  {section.id === 'upcoming-events' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                        Upcoming Events
                      </h3>
                      <div className="text-slate-500 text-sm italic">
                        [Upcoming events will appear here]
                      </div>
                    </div>
                  )}
                  
                  {section.id === 'past-events' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                        Past Events
                      </h3>
                      <div className="text-slate-500 text-sm italic">
                        [Past events will appear here]
                      </div>
                    </div>
                  )}
                  
                  {section.id === 'review-team' && (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Meet Our Review Team
                      </h3>
                      <div className="text-slate-500 text-sm italic">
                        [Reviewer profiles will appear here]
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {enabledSections.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No sections enabled. Enable at least one section in the Layout tab.
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500">
          Changes will be visible on the public landing page immediately after saving.
        </p>
        <Button onClick={handleSubmit} disabled={api.isLoading}>
          {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
