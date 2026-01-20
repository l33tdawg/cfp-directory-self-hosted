'use client';

/**
 * Dashboard Section Manager
 * 
 * Drag-and-drop interface for managing dashboard sections.
 * Allows reordering, collapsing, and showing/hiding dashboard widgets.
 */

import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronUp,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

// Section configuration
export interface DashboardSection {
  id: string;
  title: string;
  enabled: boolean;
  collapsed: boolean;
  order: number;
}

// Default admin dashboard sections
export const DEFAULT_ADMIN_SECTIONS: DashboardSection[] = [
  { id: 'stats', title: 'Statistics', enabled: true, collapsed: false, order: 0 },
  { id: 'quick-actions', title: 'Quick Actions', enabled: true, collapsed: false, order: 1 },
  { id: 'pending-items', title: 'Pending Items', enabled: true, collapsed: false, order: 2 },
  { id: 'system-health', title: 'System Health', enabled: true, collapsed: false, order: 3 },
  { id: 'recent-activity', title: 'Recent Activity', enabled: true, collapsed: false, order: 4 },
];

// Storage key for persisting layout
const STORAGE_KEY = 'dashboard-sections-layout';

// Load sections from localStorage
export function loadSavedSections(defaultSections: DashboardSection[]): DashboardSection[] {
  if (typeof window === 'undefined') return defaultSections;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultSections;
    
    const parsed = JSON.parse(saved) as Partial<DashboardSection>[];
    const savedMap = new Map(parsed.map(s => [s.id, s]));
    
    // Merge with defaults to handle new sections
    const result = defaultSections.map(defaultSection => {
      const saved = savedMap.get(defaultSection.id);
      if (saved) {
        return {
          ...defaultSection,
          enabled: saved.enabled ?? defaultSection.enabled,
          collapsed: saved.collapsed ?? defaultSection.collapsed,
          order: saved.order ?? defaultSection.order,
        };
      }
      return defaultSection;
    });
    
    return result.sort((a, b) => a.order - b.order);
  } catch {
    return defaultSections;
  }
}

// Save sections to localStorage
function saveSections(sections: DashboardSection[]) {
  if (typeof window === 'undefined') return;
  
  try {
    const toSave = sections.map(s => ({
      id: s.id,
      enabled: s.enabled,
      collapsed: s.collapsed,
      order: s.order,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Ignore storage errors
  }
}

// Sortable section item for the popover
interface SortableSectionItemProps {
  section: DashboardSection;
  onToggleEnabled: (id: string) => void;
  onToggleCollapsed: (id: string) => void;
}

function SortableSectionItem({ 
  section, 
  onToggleEnabled,
  onToggleCollapsed,
}: SortableSectionItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md",
        isDragging && "opacity-50 bg-slate-100 dark:bg-slate-800",
        !section.enabled && "opacity-60"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </button>
      
      <span className={cn(
        "flex-1 text-sm",
        section.enabled ? "text-slate-900 dark:text-white" : "text-slate-500"
      )}>
        {section.title}
      </span>
      
      <button
        onClick={() => onToggleCollapsed(section.id)}
        className={cn(
          "p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700",
          !section.enabled && "invisible"
        )}
        title={section.collapsed ? "Expand" : "Collapse"}
      >
        {section.collapsed ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        )}
      </button>
      
      <Switch
        checked={section.enabled}
        onCheckedChange={() => onToggleEnabled(section.id)}
        className="scale-75"
      />
    </div>
  );
}

// Dashboard section wrapper with collapse functionality
interface DashboardSectionWrapperProps {
  section: DashboardSection;
  children: React.ReactNode;
  onToggleCollapsed: (id: string) => void;
}

export function DashboardSectionWrapper({
  section,
  children,
  onToggleCollapsed,
}: DashboardSectionWrapperProps) {
  if (!section.enabled) return null;
  
  return (
    <div className="group relative">
      {section.collapsed ? (
        <button
          onClick={() => onToggleCollapsed(section.id)}
          className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
        >
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {section.title}
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      ) : (
        <div className="relative">
          {/* Collapse button - shows on hover */}
          <button
            onClick={() => onToggleCollapsed(section.id)}
            className="absolute -top-2 -right-2 z-10 p-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-50 dark:hover:bg-slate-700"
            title="Collapse section"
          >
            <ChevronUp className="h-3 w-3 text-slate-500" />
          </button>
          {children}
        </div>
      )}
    </div>
  );
}

// Settings popover for managing dashboard layout
interface DashboardSettingsPopoverProps {
  sections: DashboardSection[];
  onSectionsChange: (sections: DashboardSection[]) => void;
  onReset: () => void;
}

export function DashboardSettingsPopover({
  sections,
  onSectionsChange,
  onReset,
}: DashboardSettingsPopoverProps) {
  const [open, setOpen] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex).map(
        (section, index) => ({ ...section, order: index })
      );
      onSectionsChange(newSections);
    }
  };

  const handleToggleEnabled = (id: string) => {
    const newSections = sections.map(s =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onSectionsChange(newSections);
  };

  const handleToggleCollapsed = (id: string) => {
    const newSections = sections.map(s =>
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    );
    onSectionsChange(newSections);
  };

  const enabledCount = sections.filter(s => s.enabled).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">Dashboard Layout</h4>
              <p className="text-xs text-slate-500">
                {enabledCount} of {sections.length} visible
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 px-2 text-xs"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        </div>
        
        <div className="p-2 max-h-80 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sections.map(section => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onToggleEnabled={handleToggleEnabled}
                    onToggleCollapsed={handleToggleCollapsed}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Drag to reorder • Toggle to show/hide
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Hook for managing dashboard sections
export function useDashboardSections(defaultSections: DashboardSection[]) {
  // Initialize state lazily from localStorage
  const [sections, setSections] = useState<DashboardSection[]>(() => {
    if (typeof window === 'undefined') return defaultSections;
    return loadSavedSections(defaultSections);
  });
  
  // Track if we're on the client (for SSR hydration)
  const isLoaded = typeof window !== 'undefined';
  
  // Save to localStorage when sections change
  useEffect(() => {
    saveSections(sections);
  }, [sections]);
  
  const handleSectionsChange = useCallback((newSections: DashboardSection[]) => {
    setSections(newSections);
  }, []);
  
  const handleToggleCollapsed = useCallback((id: string) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    ));
  }, []);
  
  const handleReset = useCallback(() => {
    setSections([...defaultSections]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [defaultSections]);
  
  const getSection = useCallback((id: string) => {
    return sections.find(s => s.id === id);
  }, [sections]);
  
  const enabledSections = sections.filter(s => s.enabled).sort((a, b) => a.order - b.order);
  
  return {
    sections,
    enabledSections,
    isLoaded,
    handleSectionsChange,
    handleToggleCollapsed,
    handleReset,
    getSection,
  };
}
