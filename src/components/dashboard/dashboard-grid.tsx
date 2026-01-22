'use client';

/**
 * Dashboard Grid Component
 * 
 * A draggable and resizable grid layout for dashboard widgets.
 * Uses react-grid-layout for HTML5 drag-and-drop and resize functionality.
 * Fully responsive with different layouts for mobile, tablet, and desktop.
 * Persists layout changes to localStorage.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactGridLayout from 'react-grid-layout';
import { cn } from '@/lib/utils';

// Type-safe wrapper for ReactGridLayout
const GridLayout = ReactGridLayout as unknown as React.ComponentType<{
  className?: string;
  layout: LayoutItem[];
  cols: number;
  rowHeight: number;
  width: number;
  onLayoutChange?: (layout: LayoutItem[]) => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  draggableHandle?: string;
  margin?: [number, number];
  containerPadding?: [number, number];
  useCSSTransforms?: boolean;
  compactType?: 'vertical' | 'horizontal' | null;
  preventCollision?: boolean;
  children?: React.ReactNode;
}>;
import { Button } from '@/components/ui/button';
import { 
  GripVertical, 
  Maximize2, 
  RotateCcw,
  Lock,
  Unlock,
  Settings2,
  EyeOff,
  Eye,
  ChevronDown,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// Import react-grid-layout styles
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Define our own Layout type that matches what react-grid-layout actually uses
interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

// Grid configuration
const ROW_HEIGHT = 100;
const DEFAULT_STORAGE_KEY = 'dashboard-grid-layout';
const LAYOUT_VERSION = 'v2'; // Increment this to invalidate old layouts

// Responsive breakpoints
type Breakpoint = 'lg' | 'md' | 'sm' | 'xs';
const BREAKPOINT_COLS: Record<Breakpoint, number> = { lg: 12, md: 8, sm: 4, xs: 2 };

// Get current breakpoint based on width
function getBreakpoint(width: number): Breakpoint {
  if (width >= 1200) return 'lg';
  if (width >= 768) return 'md';
  if (width >= 480) return 'sm';
  return 'xs';
}

// Widget size presets - logical snap points for 12-column grid
export type WidgetSize = 'third' | 'half' | 'twoThirds' | 'full';

const SIZE_CONFIGS: Record<WidgetSize, { w: number; h: number; label: string }> = {
  third: { w: 4, h: 3, label: '1/3' },      // 1/3 width (4 cols)
  half: { w: 6, h: 3, label: '1/2' },       // 1/2 width (6 cols)
  twoThirds: { w: 8, h: 3, label: '2/3' },  // 2/3 width (8 cols)
  full: { w: 12, h: 3, label: 'Full' },     // Full width (12 cols)
};

// Minimum widget widths per breakpoint to prevent overflow
const MIN_WIDGET_COLS: Record<Breakpoint, number> = {
  lg: 4,   // Minimum 1/3 on large screens
  md: 4,   // Minimum 1/2 on medium screens  
  sm: 4,   // Full width on small screens
  xs: 2,   // Full width on extra small screens
};

export interface DashboardWidget {
  id: string;
  title: string;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface DashboardGridProps {
  widgets: DashboardWidget[];
  children: React.ReactNode[];
  defaultLayout?: LayoutItem[];
  onLayoutChange?: (layout: LayoutItem[]) => void;
  className?: string;
  /** Storage key for persisting layout to localStorage (default: 'dashboard-grid-layout') */
  storageKey?: string;
}

// Responsive layouts type
type ResponsiveLayouts = {
  [key in Breakpoint]: LayoutItem[];
};

// Generate default responsive layouts for widgets with logical constraints
function generateDefaultLayouts(widgets: DashboardWidget[]): ResponsiveLayouts {
  // Find stats widget index (if any) - it gets full width and its own row
  const statsIndex = widgets.findIndex(w => w.id === 'stats');
  const hasStats = statsIndex >= 0;
  const statsHeight = 2; // Height of stats widget
  
  // Calculate positions for non-stats widgets
  const getNonStatsPosition = (index: number, cols: number, widgetWidth: number) => {
    // Adjust index to skip stats widget
    const adjustedIndex = statsIndex >= 0 && index > statsIndex ? index - 1 : index;
    const widgetsPerRow = Math.floor(cols / widgetWidth);
    const row = Math.floor(adjustedIndex / widgetsPerRow);
    const col = (adjustedIndex % widgetsPerRow) * widgetWidth;
    // Start after stats row if stats exists
    const yOffset = hasStats ? statsHeight : 0;
    return { x: col, y: yOffset + row * 3 };
  };

  return {
    // Large screens (12 cols) - 3 columns max for regular widgets
    lg: widgets.map((widget, index) => {
      const isStatsWidget = widget.id === 'stats';
      if (isStatsWidget) {
        return {
          i: widget.id,
          x: 0,
          y: 0,
          w: 12,  // Full width
          h: statsHeight,
          minW: 8,  // Stats needs more width
          minH: 2,
          maxH: 4,
        };
      }
      const pos = getNonStatsPosition(index, 12, 4);
      return {
        i: widget.id,
        x: pos.x,
        y: pos.y,
        w: 4,  // 1/3 width
        h: 3,
        minW: MIN_WIDGET_COLS.lg,
        minH: 2,
        maxH: 6,
      };
    }),
    
    // Medium screens (8 cols) - 2 columns max for regular widgets
    md: widgets.map((widget, index) => {
      const isStatsWidget = widget.id === 'stats';
      if (isStatsWidget) {
        return {
          i: widget.id,
          x: 0,
          y: 0,
          w: 8,  // Full width
          h: statsHeight,
          minW: 6,
          minH: 2,
          maxH: 4,
        };
      }
      const pos = getNonStatsPosition(index, 8, 4);
      return {
        i: widget.id,
        x: pos.x,
        y: pos.y,
        w: 4,  // 1/2 width
        h: 3,
        minW: MIN_WIDGET_COLS.md,
        minH: 2,
        maxH: 6,
      };
    }),
    
    // Small screens (4 cols) - 1 column (full width)
    sm: widgets.map((widget, index) => {
      // On small screens, stack everything vertically
      let yPos = 0;
      for (let i = 0; i < index; i++) {
        yPos += widgets[i].id === 'stats' ? statsHeight : 3;
      }
      return {
        i: widget.id,
        x: 0,
        y: yPos,
        w: 4,  // Full width
        h: widget.id === 'stats' ? statsHeight : 3,
        minW: MIN_WIDGET_COLS.sm,
        minH: 2,
        maxH: 5,
        isResizable: false,
      };
    }),
    
    // Extra small screens (2 cols) - 1 column (full width)
    xs: widgets.map((widget, index) => {
      let yPos = 0;
      for (let i = 0; i < index; i++) {
        yPos += widgets[i].id === 'stats' ? statsHeight : 3;
      }
      return {
        i: widget.id,
        x: 0,
        y: yPos,
        w: 2,  // Full width
        h: widget.id === 'stats' ? statsHeight : 3,
        minW: MIN_WIDGET_COLS.xs,
        minH: 2,
        maxH: 5,
        isResizable: false,
      };
    }),
  };
}

// Get versioned storage key
function getVersionedKey(storageKey: string): string {
  return `${storageKey}-${LAYOUT_VERSION}`;
}

// Load saved layouts from localStorage
function loadSavedLayouts(storageKey: string): ResponsiveLayouts | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const versionedKey = getVersionedKey(storageKey);
    const saved = localStorage.getItem(versionedKey);
    if (!saved) {
      // Clear any old unversioned layouts
      localStorage.removeItem(storageKey);
      return null;
    }
    return JSON.parse(saved) as ResponsiveLayouts;
  } catch {
    return null;
  }
}

// Save layouts to localStorage
function saveLayouts(layouts: ResponsiveLayouts, storageKey: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const versionedKey = getVersionedKey(storageKey);
    localStorage.setItem(versionedKey, JSON.stringify(layouts));
  } catch {
    // Ignore storage errors
  }
}

// Clear saved layouts
function clearSavedLayouts(storageKey: string) {
  if (typeof window === 'undefined') return;
  const versionedKey = getVersionedKey(storageKey);
  localStorage.removeItem(versionedKey);
  // Also clear old unversioned key
  localStorage.removeItem(storageKey);
}

// Load hidden widgets from localStorage
function loadHiddenWidgets(storageKey: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const versionedKey = getVersionedKey(storageKey);
    const saved = localStorage.getItem(`${versionedKey}-hidden`);
    if (!saved) return new Set();
    return new Set(JSON.parse(saved) as string[]);
  } catch {
    return new Set();
  }
}

// Save hidden widgets to localStorage
function saveHiddenWidgets(hidden: Set<string>, storageKey: string) {
  if (typeof window === 'undefined') return;
  
  try {
    const versionedKey = getVersionedKey(storageKey);
    localStorage.setItem(`${versionedKey}-hidden`, JSON.stringify([...hidden]));
  } catch {
    // Ignore storage errors
  }
}

// Clear hidden widgets
function clearHiddenWidgets(storageKey: string) {
  if (typeof window === 'undefined') return;
  const versionedKey = getVersionedKey(storageKey);
  localStorage.removeItem(`${versionedKey}-hidden`);
}

// Grid Item Wrapper Component
interface GridItemWrapperProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  isLocked: boolean;
  onCycleSize?: () => void;
  onHide?: () => void;
  currentSize?: string;
}

function GridItemWrapper({ 
  widget, 
  children, 
  isLocked,
  onCycleSize,
  onHide,
  currentSize,
}: GridItemWrapperProps) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden group">
      {/* Drag Handle Header */}
      {!isLocked && (
        <div 
          className="drag-handle flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {widget.title}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onCycleSize && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onCycleSize();
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Change size (current: {currentSize})</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onHide && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onHide();
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Hide widget</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}
      
      {/* Widget Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export function DashboardGrid({
  widgets,
  children,
  className,
  storageKey = DEFAULT_STORAGE_KEY,
}: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // Default to locked for better UX
  const [containerWidth, setContainerWidth] = useState(1200);
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => {
    const saved = loadSavedLayouts(storageKey);
    return saved || generateDefaultLayouts(widgets);
  });
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(() => {
    return loadHiddenWidgets(storageKey);
  });

  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const cols = BREAKPOINT_COLS[breakpoint];

  // Filter visible widgets and children
  const visibleWidgets = useMemo(() => 
    widgets.filter(w => !hiddenWidgets.has(w.id)), 
    [widgets, hiddenWidgets]
  );
  
  const hiddenWidgetsList = useMemo(() => 
    widgets.filter(w => hiddenWidgets.has(w.id)), 
    [widgets, hiddenWidgets]
  );

  // Handle client-side mounting and responsive detection
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    
    // Re-load from localStorage on mount to ensure we have latest
    const saved = loadSavedLayouts(storageKey);
    if (saved) {
      setLayouts(saved);
    }
    
    const savedHidden = loadHiddenWidgets(storageKey);
    if (savedHidden.size > 0) {
      setHiddenWidgets(savedHidden);
    }
    
    // Measure container width and update breakpoint
    const updateWidth = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        setBreakpoint(getBreakpoint(width));
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [storageKey]);

  // Handle layout changes for the current breakpoint
  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayouts(prev => {
      const updated = { ...prev, [breakpoint]: newLayout };
      saveLayouts(updated, storageKey);
      return updated;
    });
  }, [breakpoint, storageKey]);

  // Reset to default layouts and show all widgets
  const handleReset = useCallback(() => {
    const defaultLayouts = generateDefaultLayouts(widgets);
    setLayouts(defaultLayouts);
    setHiddenWidgets(new Set());
    clearSavedLayouts(storageKey);
    clearHiddenWidgets(storageKey);
  }, [widgets, storageKey]);

  // Toggle lock mode
  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  // Hide a widget
  const hideWidget = useCallback((widgetId: string) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      next.add(widgetId);
      saveHiddenWidgets(next, storageKey);
      return next;
    });
  }, [storageKey]);

  // Show a hidden widget
  const showWidget = useCallback((widgetId: string) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      next.delete(widgetId);
      saveHiddenWidgets(next, storageKey);
      return next;
    });
  }, [storageKey]);

  // Show all hidden widgets
  const showAllWidgets = useCallback(() => {
    setHiddenWidgets(new Set());
    clearHiddenWidgets(storageKey);
  }, [storageKey]);

  // Cycle widget size through logical snap points (only affects lg/md layouts)
  const cycleWidgetSize = useCallback((widgetId: string) => {
    setLayouts(prev => {
      const sizeOrder: WidgetSize[] = ['third', 'half', 'twoThirds', 'full'];
      const lgLayout = prev.lg || [];
      const mdLayout = prev.md || [];
      const lgItemIndex = lgLayout.findIndex(item => item.i === widgetId);
      const mdItemIndex = mdLayout.findIndex(item => item.i === widgetId);
      
      if (lgItemIndex === -1) return prev;
      
      const currentW = lgLayout[lgItemIndex].w;
      
      // Find current size index based on width
      let currentSizeIndex = 0;
      if (currentW <= 4) currentSizeIndex = 0;       // 1/3
      else if (currentW <= 6) currentSizeIndex = 1;  // 1/2
      else if (currentW <= 8) currentSizeIndex = 2;  // 2/3
      else currentSizeIndex = 3;                      // Full
      
      // Cycle to next size
      const nextSizeIndex = (currentSizeIndex + 1) % sizeOrder.length;
      const nextSize = SIZE_CONFIGS[sizeOrder[nextSizeIndex]];
      
      // Update lg layout
      const newLgLayout = [
        ...lgLayout.slice(0, lgItemIndex),
        { ...lgLayout[lgItemIndex], w: nextSize.w },
        ...lgLayout.slice(lgItemIndex + 1),
      ];
      
      // Also update md layout proportionally (8 cols instead of 12)
      const mdWidth = Math.min(8, Math.round(nextSize.w * 8 / 12));
      const newMdLayout = mdItemIndex >= 0 ? [
        ...mdLayout.slice(0, mdItemIndex),
        { ...mdLayout[mdItemIndex], w: Math.max(4, mdWidth) },
        ...mdLayout.slice(mdItemIndex + 1),
      ] : mdLayout;
      
      const newLayouts = { ...prev, lg: newLgLayout, md: newMdLayout };
      saveLayouts(newLayouts, storageKey);
      return newLayouts;
    });
  }, [storageKey]);

  // Get current size label for a widget
  const getWidgetSizeLabel = useCallback((widgetId: string): string => {
    const lgLayout = layouts.lg || [];
    const item = lgLayout.find(l => l.i === widgetId);
    if (!item) return '1/3';
    
    // Map width to size label
    if (item.w <= 4) return SIZE_CONFIGS.third.label;
    if (item.w <= 6) return SIZE_CONFIGS.half.label;
    if (item.w <= 8) return SIZE_CONFIGS.twoThirds.label;
    return SIZE_CONFIGS.full.label;
  }, [layouts]);

  // Create children array matching widget order
  const childrenArray = useMemo(() => {
    return Array.isArray(children) ? children : [children];
  }, [children]);

  // Get visible children (filter out hidden widgets)
  const visibleChildrenMap = useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    widgets.forEach((widget, index) => {
      if (!hiddenWidgets.has(widget.id)) {
        map.set(widget.id, childrenArray[index]);
      }
    });
    return map;
  }, [widgets, childrenArray, hiddenWidgets]);

  // Get current layout filtered for visible widgets only
  const visibleLayout = useMemo(() => {
    const currentLayout = layouts[breakpoint] || [];
    return currentLayout.filter(item => !hiddenWidgets.has(item.i));
  }, [layouts, breakpoint, hiddenWidgets]);

  // SSR: Render a simple grid on server
  if (!mounted) {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
        {childrenArray.map((child, index) => (
          <div key={widgets[index]?.id || index} className="min-h-[200px]">
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      {/* Grid Controls - hidden on mobile */}
      {!isMobile && (
        <div className="flex items-center justify-end gap-2 mb-4">
          {/* Hidden Widgets Dropdown */}
          {hiddenWidgetsList.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:border-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {hiddenWidgetsList.length} Hidden
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Hidden Widgets</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hiddenWidgetsList.map(widget => (
                  <DropdownMenuItem
                    key={widget.id}
                    onClick={() => showWidget(widget.id)}
                    className="cursor-pointer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Show {widget.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={showAllWidgets}
                  className="cursor-pointer text-blue-600 dark:text-blue-400"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show All Widgets
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleLock}
                  className={cn(
                    "gap-2",
                    isLocked && "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400"
                  )}
                >
                  {isLocked ? (
                    <>
                      <Lock className="h-4 w-4" />
                      <span className="hidden sm:inline">Locked</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      <span className="hidden sm:inline">Unlocked</span>
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLocked ? 'Unlock to customize layout' : 'Lock layout'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Reset to default layout and show all widgets
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Responsive Grid Layout */}
      <GridLayout
        className="layout"
        layout={visibleLayout}
        cols={cols}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={!isLocked && !isMobile}
        isResizable={false}  // Disable free-form resize - use cycle button instead for logical sizes
        draggableHandle=".drag-handle"
        margin={isMobile ? [8, 8] : [12, 12]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {visibleWidgets.map((widget) => (
          <div key={widget.id} className="grid-item">
            <GridItemWrapper 
              widget={widget} 
              isLocked={isLocked || isMobile}
              onCycleSize={!isMobile ? () => cycleWidgetSize(widget.id) : undefined}
              onHide={!isMobile ? () => hideWidget(widget.id) : undefined}
              currentSize={getWidgetSizeLabel(widget.id)}
            >
              {visibleChildrenMap.get(widget.id)}
            </GridItemWrapper>
          </div>
        ))}
      </GridLayout>

      {/* Help text when unlocked - hidden on mobile */}
      {!isLocked && !isMobile && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <Settings2 className="h-3 w-3 inline mr-1" />
            Drag widgets to reorder. Click <Maximize2 className="h-3 w-3 inline mx-0.5" /> to resize, <EyeOff className="h-3 w-3 inline mx-0.5" /> to hide.
          </p>
        </div>
      )}
    </div>
  );
}

export default DashboardGrid;
