'use client';

/**
 * Landing Page Section Manager
 * 
 * Drag-and-drop interface for managing landing page sections.
 * Allows reordering and enabling/disabling of predefined sections.
 */

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { 
  GripVertical, 
  FileText, 
  Calendar, 
  Users, 
  Eye,
  EyeOff,
  LayoutTemplate,
} from 'lucide-react';

// Section types that can be configured
export interface LandingPageSection {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  order: number;
}

// Default sections available on the landing page
export const DEFAULT_SECTIONS: LandingPageSection[] = [
  {
    id: 'hero',
    name: 'Hero Content',
    description: 'Main heading and custom content area',
    icon: FileText,
    enabled: true,
    order: 0,
  },
  {
    id: 'open-cfps',
    name: 'Open CFPs',
    description: 'Events currently accepting submissions',
    icon: Calendar,
    enabled: true,
    order: 1,
  },
  {
    id: 'upcoming-events',
    name: 'Upcoming Events',
    description: 'Future events not yet accepting submissions',
    icon: Calendar,
    enabled: true,
    order: 2,
  },
  {
    id: 'past-events',
    name: 'Past Events',
    description: 'Previously held events',
    icon: Calendar,
    enabled: true,
    order: 3,
  },
  {
    id: 'review-team',
    name: 'Review Team',
    description: 'Meet our reviewers section',
    icon: Users,
    enabled: true,
    order: 4,
  },
];

interface SortableSectionItemProps {
  section: LandingPageSection;
  onToggle: (id: string, enabled: boolean) => void;
}

function SortableSectionItem({ section, onToggle }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = section.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg",
        isDragging && "opacity-50 shadow-lg ring-2 ring-blue-500",
        !section.enabled && "opacity-60"
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-slate-400" />
      </button>

      {/* Section Icon */}
      <div className={cn(
        "p-2 rounded-lg",
        section.enabled 
          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
          : "bg-slate-100 dark:bg-slate-700 text-slate-400"
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Section Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium",
            section.enabled 
              ? "text-slate-900 dark:text-white" 
              : "text-slate-500 dark:text-slate-400"
          )}>
            {section.name}
          </span>
          {!section.enabled && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <EyeOff className="h-3 w-3" />
              Hidden
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
          {section.description}
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">
          {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </span>
        <Switch
          checked={section.enabled}
          onCheckedChange={(checked) => onToggle(section.id, checked)}
          aria-label={`${section.enabled ? 'Hide' : 'Show'} ${section.name}`}
        />
      </div>
    </div>
  );
}

interface LandingPageSectionManagerProps {
  sections: LandingPageSection[];
  onChange: (sections: LandingPageSection[]) => void;
}

export function LandingPageSectionManager({ 
  sections, 
  onChange 
}: LandingPageSectionManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({
          ...section,
          order: index,
        })
      );

      onChange(newSections);
    }
  };

  const handleToggle = (id: string, enabled: boolean) => {
    const newSections = sections.map((section) =>
      section.id === id ? { ...section, enabled } : section
    );
    onChange(newSections);
  };

  const enabledCount = sections.filter((s) => s.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-slate-500" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Page Sections
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {enabledCount} of {sections.length} visible
        </span>
      </div>

      {/* Drag and Drop List */}
      <Card>
        <CardContent className="p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Help Text */}
      <p className="text-xs text-slate-500 text-center">
        Drag sections to reorder • Toggle switches to show/hide
      </p>
    </div>
  );
}

/**
 * Helper function to merge saved sections with defaults
 * (handles new sections added after initial save)
 */
export function mergeSectionsWithDefaults(
  savedSections: Partial<LandingPageSection>[] | null | undefined
): LandingPageSection[] {
  if (!savedSections || savedSections.length === 0) {
    return [...DEFAULT_SECTIONS];
  }

  // Start with saved sections in their order
  const result: LandingPageSection[] = [];
  const usedIds = new Set<string>();

  // Add saved sections first (preserving their order)
  savedSections.forEach((saved) => {
    const defaultSection = DEFAULT_SECTIONS.find((d) => d.id === saved.id);
    if (defaultSection) {
      result.push({
        ...defaultSection,
        enabled: saved.enabled ?? defaultSection.enabled,
        order: saved.order ?? result.length,
      });
      usedIds.add(saved.id!);
    }
  });

  // Add any new default sections that weren't in saved data
  DEFAULT_SECTIONS.forEach((defaultSection) => {
    if (!usedIds.has(defaultSection.id)) {
      result.push({
        ...defaultSection,
        order: result.length,
      });
    }
  });

  // Sort by order
  return result.sort((a, b) => a.order - b.order);
}

/**
 * Convert sections to JSON-serializable format for storage
 */
export function sectionsToJson(sections: LandingPageSection[]): object[] {
  return sections.map((s) => ({
    id: s.id,
    enabled: s.enabled,
    order: s.order,
  }));
}
