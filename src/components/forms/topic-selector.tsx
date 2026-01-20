'use client';

/**
 * Topic Selector Component
 * 
 * Reusable component for selecting topics from the database-driven
 * topic system. Used across speakers, talks, reviewers, and events.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, X, Plus, Loader2 } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Topic {
  id: string;
  name: string;
  category: string | null;
  description?: string | null;
  usageCount?: number;
}

interface TopicSelectorProps {
  /** Currently selected topic names */
  selectedTopics: string[];
  /** Callback when topics change */
  onTopicsChange: (topics: string[]) => void;
  /** Maximum number of topics allowed */
  maxTopics?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to allow creating new topics */
  allowCreate?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Error message */
  error?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function TopicSelector({
  selectedTopics,
  onTopicsChange,
  maxTopics = 50,
  placeholder = 'Select topics...',
  allowCreate = false,
  disabled = false,
  className,
  error,
}: TopicSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch topics from API
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const res = await fetch('/api/topics?limit=500');
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (error) {
        console.error('Failed to fetch topics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTopics();
  }, []);

  // Group topics by category
  const groupedTopics = useMemo(() => {
    const groups: Record<string, Topic[]> = {};
    
    topics.forEach(topic => {
      const category = topic.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(topic);
    });
    
    // Sort categories alphabetically, but put "Other" last
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
    
    return sortedCategories.map(category => ({
      category,
      topics: groups[category].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [topics]);

  // Filter topics based on search
  const filteredGroups = useMemo(() => {
    if (!search) return groupedTopics;
    
    const searchLower = search.toLowerCase();
    return groupedTopics
      .map(group => ({
        category: group.category,
        topics: group.topics.filter(topic =>
          topic.name.toLowerCase().includes(searchLower)
        ),
      }))
      .filter(group => group.topics.length > 0);
  }, [groupedTopics, search]);

  // Check if current search matches any existing topic
  const searchMatchesExisting = useMemo(() => {
    if (!search) return true;
    return topics.some(t => t.name.toLowerCase() === search.toLowerCase());
  }, [topics, search]);

  // Can add more topics?
  const canAddMore = selectedTopics.length < maxTopics;

  // Toggle topic selection
  const toggleTopic = useCallback((topicName: string) => {
    if (selectedTopics.includes(topicName)) {
      onTopicsChange(selectedTopics.filter(t => t !== topicName));
    } else if (canAddMore) {
      onTopicsChange([...selectedTopics, topicName]);
    }
  }, [selectedTopics, onTopicsChange, canAddMore]);

  // Remove topic
  const removeTopic = useCallback((topicName: string) => {
    onTopicsChange(selectedTopics.filter(t => t !== topicName));
  }, [selectedTopics, onTopicsChange]);

  // Create new topic
  const createTopic = useCallback(async () => {
    if (!search.trim() || !allowCreate || !canAddMore) return;
    
    setIsCreating(true);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: search.trim() }),
      });
      
      if (res.ok) {
        const newTopic = await res.json();
        setTopics(prev => [...prev, newTopic]);
        toggleTopic(newTopic.name);
        setSearch('');
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
    } finally {
      setIsCreating(false);
    }
  }, [search, allowCreate, canAddMore, toggleTopic]);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Selected Topics Display */}
      {selectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTopics.map(topic => (
            <Badge
              key={topic}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {topic}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTopic(topic)}
                  className="ml-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Topic Selector Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || !canAddMore}
            className={cn(
              'w-full justify-between',
              !selectedTopics.length && 'text-muted-foreground',
              error && 'border-red-500'
            )}
          >
            {!canAddMore 
              ? `Maximum ${maxTopics} topics selected`
              : selectedTopics.length > 0
                ? `${selectedTopics.length} topic${selectedTopics.length > 1 ? 's' : ''} selected`
                : placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder="Search topics..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading topics...
                </div>
              ) : filteredGroups.length === 0 && !search ? (
                <CommandEmpty>No topics available.</CommandEmpty>
              ) : filteredGroups.length === 0 && search ? (
                <CommandEmpty>
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      No topics found for &quot;{search}&quot;
                    </p>
                    {allowCreate && !searchMatchesExisting && canAddMore && (
                      <Button
                        size="sm"
                        onClick={createTopic}
                        disabled={isCreating}
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        Create &quot;{search}&quot;
                      </Button>
                    )}
                  </div>
                </CommandEmpty>
              ) : (
                <>
                  {filteredGroups.map(group => (
                    <CommandGroup key={group.category} heading={group.category}>
                      {group.topics.map(topic => {
                        const isSelected = selectedTopics.includes(topic.name);
                        return (
                          <CommandItem
                            key={topic.id}
                            value={topic.name}
                            onSelect={() => toggleTopic(topic.name)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center">
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  isSelected ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span>{topic.name}</span>
                            </div>
                            {topic.usageCount !== undefined && topic.usageCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {topic.usageCount}
                              </span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                  
                  {/* Create option at bottom */}
                  {allowCreate && search && !searchMatchesExisting && canAddMore && (
                    <CommandGroup heading="Create New">
                      <CommandItem
                        onSelect={createTopic}
                        className="flex items-center"
                      >
                        {isCreating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Create &quot;{search}&quot;
                      </CommandItem>
                    </CommandGroup>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Character Count / Limit */}
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          {selectedTopics.length} / {maxTopics} topics
        </span>
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SIMPLE TOPIC INPUT (Alternative: Free-form text input)
// =============================================================================

interface SimpleTopicInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  maxTopics?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SimpleTopicInput({
  value,
  onChange,
  maxTopics = 25,
  placeholder = 'Type and press Enter to add...',
  disabled = false,
  className,
}: SimpleTopicInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (value.length < maxTopics && !value.includes(input.trim())) {
        onChange([...value, input.trim()]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border rounded-md bg-background">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {value.length < maxTopics && (
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] border-0 focus-visible:ring-0 p-0 h-6"
          />
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {value.length} / {maxTopics} tags
      </div>
    </div>
  );
}

export default TopicSelector;
