/**
 * Event Tracks Section
 * 
 * Client component for managing event tracks.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Loader2, Tag, FileText } from 'lucide-react';

interface Track {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  _count: {
    submissions: number;
  };
}

interface EventTracksSectionProps {
  eventId: string;
  tracks: Track[];
}

export function EventTracksSection({ eventId, tracks: initialTracks }: EventTracksSectionProps) {
  const router = useRouter();
  const api = useApi();
  const [tracks, setTracks] = useState(initialTracks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTrack, setNewTrack] = useState({
    name: '',
    description: '',
    color: '#6366f1',
  });
  
  const handleAddTrack = async () => {
    if (!newTrack.name.trim()) {
      toast.error('Track name is required');
      return;
    }
    
    const { data, error } = await api.post(`/api/events/${eventId}/tracks`, newTrack);
    
    if (error) return;
    
    setTracks([...tracks, { ...data as Track, _count: { submissions: 0 } }]);
    setNewTrack({ name: '', description: '', color: '#6366f1' });
    setIsDialogOpen(false);
    toast.success('Track added successfully');
    router.refresh();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tracks</CardTitle>
          <CardDescription>
            Organize submissions by topic or theme
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Track
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Track</DialogTitle>
              <DialogDescription>
                Create a new track for this event
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Frontend, DevOps, AI/ML"
                  value={newTrack.name}
                  onChange={(e) => setNewTrack({ ...newTrack, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What topics does this track cover?"
                  value={newTrack.description}
                  onChange={(e) => setNewTrack({ ...newTrack, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={newTrack.color}
                    onChange={(e) => setNewTrack({ ...newTrack, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                  <Input
                    value={newTrack.color}
                    onChange={(e) => setNewTrack({ ...newTrack, color: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTrack} disabled={api.isLoading}>
                {api.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Track
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tracks.length > 0 ? (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: track.color || '#6366f1' }}
                  />
                  <div>
                    <p className="font-medium">{track.name}</p>
                    {track.description && (
                      <p className="text-sm text-slate-500">{track.description}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  {track._count.submissions}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Tag className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="text-slate-500">No tracks yet</p>
            <p className="text-sm text-slate-400">
              Add tracks to categorize submissions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
