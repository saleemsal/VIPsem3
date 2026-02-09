import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings with proper spacing and colors - enhanced contrast
          h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-semibold mb-2 mt-3 first:mt-0 text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-foreground">{children}</h3>,
          
          // Lists with better spacing and enhanced visibility
          ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2 text-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2 text-foreground">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed text-foreground">{children}</li>,
          
          // Enhanced text formatting with better contrast
          strong: ({ children }) => <strong className="font-bold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic text-foreground">{children}</em>,
          code: ({ children }) => (
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground border border-border/50 font-semibold">
              {children}
            </code>
          ),
          
          // Code blocks with better contrast
          pre: ({ children }) => (
            <pre className="bg-muted p-4 rounded-md overflow-x-auto mb-3 border border-border/30 text-foreground">
              {children}
            </pre>
          ),
          
          // Paragraphs with proper spacing and text color
          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-foreground">{children}</p>,
          
          // Enhanced links with gold theme
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-gt-gold hover:text-gt-gold-light underline decoration-gt-gold/60 hover:decoration-gt-gold transition-all duration-200 font-medium" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Enhanced blockquotes with better styling
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gt-gold/60 pl-4 italic text-muted-foreground my-3 bg-muted/30 py-3 rounded-r-md">
              {children}
            </blockquote>
          ),
          
          // Tables with enhanced styling
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-border rounded-md">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-muted font-semibold text-left text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-foreground">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}