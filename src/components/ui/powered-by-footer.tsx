/**
 * Powered by CFP Directory Footer
 * 
 * Required attribution component for the open-source version.
 * This can be removed with a commercial license.
 * 
 * @see TRADEMARK.md for attribution requirements
 */

import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PoweredByFooterProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'inline';
  showIcon?: boolean;
}

export function PoweredByFooter({ 
  className, 
  variant = 'default',
  showIcon = true 
}: PoweredByFooterProps) {
  const linkClasses = "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors";
  
  if (variant === 'inline') {
    return (
      <span className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>
        Powered by{' '}
        <a 
          href="https://cfp.directory" 
          target="_blank" 
          rel="noopener noreferrer"
          className={linkClasses}
        >
          CFP Directory
          {showIcon && <ExternalLink className="inline h-3 w-3 ml-1" />}
        </a>
      </span>
    );
  }
  
  if (variant === 'minimal') {
    return (
      <div className={cn("text-center text-xs text-slate-400 dark:text-slate-500", className)}>
        <a 
          href="https://cfp.directory" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Powered by CFP Directory
        </a>
      </div>
    );
  }
  
  // Default variant
  return (
    <footer className={cn(
      "border-t border-slate-200 dark:border-slate-800 py-6 mt-auto",
      className
    )}>
      <div className="container mx-auto px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          Powered by{' '}
          <a 
            href="https://cfp.directory" 
            target="_blank" 
            rel="noopener noreferrer"
            className={cn(linkClasses, "inline-flex items-center gap-1")}
          >
            CFP Directory
            {showIcon && <ExternalLink className="h-3 w-3" />}
          </a>
        </p>
      </div>
    </footer>
  );
}

/**
 * Full Site Footer
 * 
 * Extended footer with additional links and information.
 */
interface SiteFooterProps {
  className?: string;
  siteName?: string;
  showLinks?: boolean;
}

export function SiteFooter({ 
  className, 
  siteName,
  showLinks = true 
}: SiteFooterProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={cn(
      "border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
      className
    )}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Left side */}
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {siteName && (
              <span>© {currentYear} {siteName}. </span>
            )}
            <span>
              Powered by{' '}
              <a 
                href="https://cfp.directory" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                CFP Directory
              </a>
            </span>
          </div>
          
          {/* Right side - Links */}
          {showLinks && (
            <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-slate-400">
              <a 
                href="https://github.com/l33tdawg/cfp-directory-self-hosted"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                GitHub
              </a>
              <a 
                href="https://cfp.directory/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Documentation
              </a>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
