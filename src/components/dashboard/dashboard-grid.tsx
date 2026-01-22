'use client';

/**
 * Dashboard Grid Component
 * 
 * A draggable and resizable grid layout for dashboard widgets.
 * Uses react-grid-layout for HTML5 drag-and-drop and resize functionality.
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
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
const GRID_COLS = 12;
const ROW_HEIGHT = 100;
const STORAGE_KEY = 'admin-dashboard-grid-layout';

// Widget size presets
export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

const SIZE_CONFIGS: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 4, h: 3 },   // 1/3 width
  medium: { w: 6, h: 3 },  // 1/2 width
  large: { w: 8, h: 3 },   // 2/3 width
  full: { w: 12, h: 3 },   // Full width
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
}

// Generate default layout for widgets
function generateDefaultLayout(widgets: DashboardWidget[]): LayoutItem[] {
  return widgets.map((widget, index) => {
    // Create a sensible default layout
    const row = Math.floor(index / 3);
    const col = (index % 3) * 4;
    
    return {
      i: widget.id,
      x: col,
      y: row * 3,
      w: widget.id === 'stats' ? 12 : 4, // Stats full width
      h: widget.id === 'stats' ? 2 : 3,
      minW: widget.minW || 3,
      minH: widget.minH || 2,
      maxW: widget.maxW || 12,
      maxH: widget.maxH || 6,
    };
  });
}

// Load saved layout from localStorage
function loadSavedLayout(): LayoutItem[] | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as LayoutItem[];
  } catch {
    return null;
  }
}

// Save layout to localStorage
function saveLayout(layout: LayoutItem[]) {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage errors
  }
}

// Clear saved layout
function clearSavedLayout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// Grid Item Wrapper Component
interface GridItemWrapperProps {
  widget: DashboardWidget;
  children: React.ReactNode;
  isLocked: boolean;
  onCycleSize?: () => void;
  currentSize?: string;
}

function GridItemWrapper({ 
  widget, 
  children, 
  isLocked,
  onCycleSize,
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
                    <p>Cycle size ({currentSize})</p>
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
}: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    const saved = loadSavedLayout();
    return saved || generateDefaultLayout(widgets);
  });

  // Handle client-side mounting and width measurement
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Re-load from localStorage on mount to ensure we have latest
    const saved = loadSavedLayout();
    if (saved) {
      setLayout(saved);
    }
    
    // Measure container width
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    saveLayout(newLayout);
  }, []);

  // Reset to default layout
  const handleReset = useCallback(() => {
    const defaultLayout = generateDefaultLayout(widgets);
    setLayout(defaultLayout);
    clearSavedLayout();
  }, [widgets]);

  // Toggle lock mode
  const handleToggleLock = useCallback(() => {
    setIsLocked(prev => !prev);
  }, []);

  // Cycle widget size
  const cycleWidgetSize = useCallback((widgetId: string) => {
    setLayout(prev => {
      const sizes: WidgetSize[] = ['small', 'medium', 'large', 'full'];
      const itemIndex = prev.findIndex(item => item.i === widgetId);
      
      if (itemIndex === -1) return prev;
      
      const currentW = prev[itemIndex].w;
      let currentSizeIndex = 0;
      
      // Find closest size
      if (currentW <= 4) currentSizeIndex = 0;
      else if (currentW <= 6) currentSizeIndex = 1;
      else if (currentW <= 8) currentSizeIndex = 2;
      else currentSizeIndex = 3;
      
      const nextSizeIndex = (currentSizeIndex + 1) % sizes.length;
      const nextSize = SIZE_CONFIGS[sizes[nextSizeIndex]];
      
      const newLayout = [
        ...prev.slice(0, itemIndex),
        { ...prev[itemIndex], w: nextSize.w },
        ...prev.slice(itemIndex + 1),
      ];
      
      saveLayout(newLayout);
      return newLayout;
    });
  }, []);

  // Get current size label for a widget
  const getWidgetSizeLabel = useCallback((widgetId: string): string => {
    const item = layout.find(l => l.i === widgetId);
    if (!item) return 'medium';
    
    if (item.w <= 4) return '1/3';
    if (item.w <= 6) return '1/2';
    if (item.w <= 8) return '2/3';
    return 'full';
  }, [layout]);

  // Create children array matching widget order
  const childrenArray = useMemo(() => {
    return Array.isArray(children) ? children : [children];
  }, [children]);

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
      {/* Grid Controls */}
      <div className="flex items-center justify-end gap-2 mb-4">
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
              {isLocked ? 'Unlock to drag and resize' : 'Lock layout'}
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
                <span className="hidden sm:inline">Reset Layout</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Reset to default layout
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Grid Layout */}
      <GridLayout
        className="layout"
        layout={layout}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        draggableHandle=".drag-handle"
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget, index) => (
          <div key={widget.id} className="grid-item">
            <GridItemWrapper 
              widget={widget} 
              isLocked={isLocked}
              onCycleSize={() => cycleWidgetSize(widget.id)}
              currentSize={getWidgetSizeLabel(widget.id)}
            >
              {childrenArray[index]}
            </GridItemWrapper>
          </div>
        ))}
      </GridLayout>

      {/* Help text when unlocked */}
      {!isLocked && (
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <Settings2 className="h-3 w-3 inline mr-1" />
            Drag widgets by the header to reorder. Drag edges to resize. Click the expand icon to cycle sizes.
          </p>
        </div>
      )}
    </div>
  );
}

export default DashboardGrid;
