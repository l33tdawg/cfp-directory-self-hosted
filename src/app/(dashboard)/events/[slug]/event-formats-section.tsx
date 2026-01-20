/**
 * Event Formats Section
 * 
 * Client component for managing event formats.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { toast } from 'sonner';
import { Plus, Loader2, Clock, FileText } from 'lucide-react';

interface Format {
  id: string;
  name: string;
  durationMin: number;
  _count: {
    submissions: number;
  };
}

interface EventFormatsSectionProps {
  eventId: string;
  formats: Format[];
}

export function EventFormatsSection({ eventId, formats: initialFormats }: EventFormatsSectionProps) {
  const router = useRouter();
  const api = useApi();
  const [formats, setFormats] = useState(initialFormats);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newFormat, setNewFormat] = useState({
    name: '',
    durationMin: 30,
  });
  
  const handleAddFormat = async () => {
    if (!newFormat.name.trim()) {
      toast.error('Format name is required');
      return;
    }
    
    if (newFormat.durationMin < 5 || newFormat.durationMin > 480) {
      toast.error('Duration must be between 5 and 480 minutes');
      return;
    }
    
    const { data, error } = await api.post(`/api/events/${eventId}/formats`, newFormat);
    
    if (error) return;
    
    setFormats([...formats, { ...data as Format, _count: { submissions: 0 } }]);
    setNewFormat({ name: '', durationMin: 30 });
    setIsDialogOpen(false);
    toast.success('Format added successfully');
    router.refresh();
  };
  
  // Preset formats for quick add
  const presetFormats = [
    { name: 'Talk', durationMin: 30 },
    { name: 'Lightning Talk', durationMin: 10 },
    { name: 'Workshop', durationMin: 90 },
    { name: 'Keynote', durationMin: 45 },
    { name: 'Panel', durationMin: 60 },
  ];
  
  const handleQuickAdd = async (preset: { name: string; durationMin: number }) => {
    // Check if format with same name already exists
    if (formats.some(f => f.name.toLowerCase() === preset.name.toLowerCase())) {
      toast.error(`Format "${preset.name}" already exists`);
      return;
    }
    
    const { data, error } = await api.post(`/api/events/${eventId}/formats`, preset);
    
    if (error) return;
    
    setFormats([...formats, { ...data as Format, _count: { submissions: 0 } }]);
    toast.success(`Format "${preset.name}" added`);
    router.refresh();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Formats</CardTitle>
          <CardDescription>
            Define session types and durations
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Format
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Format</DialogTitle>
              <DialogDescription>
                Create a new session format for this event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Talk, Workshop, Lightning Talk"
                  value={newFormat.name}
                  onChange={(e) => setNewFormat({ ...newFormat, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={480}
                  value={newFormat.durationMin}
                  onChange={(e) => setNewFormat({ ...newFormat, durationMin: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFormat} disabled={api.isLoading}>
                {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Format
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {formats.length > 0 ? (
          <div className="space-y-3">
            {formats.map((format) => (
              <div
                key={format.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="font-medium">{format.name}</p>
                    <p className="text-sm text-slate-500">{format.durationMin} minutes</p>
                  </div>
                </div>
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  {format._count.submissions}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500 mb-4">No formats yet</p>
            <p className="text-sm text-slate-400 mb-4">
              Quick add common formats:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {presetFormats.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(preset)}
                  disabled={api.isLoading}
                >
                  {preset.name} ({preset.durationMin}m)
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
