import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { TrackingSnippet } from './SnippetManager';

export default function TrackingInjector() {
  const injectedNodes = useRef<Node[]>([]);

  useEffect(() => {
    loadAndInject();

    // Subscribe to changes in site_settings
    const subscription = supabase
      .channel('site_settings_tracking')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        (payload) => {
            // Check if the changed setting is relevant
            if (payload.new && 'setting_key' in payload.new) {
                const key = (payload.new as any).setting_key;
                if (key === 'tracking_head_snippets' || key === 'tracking_body_snippets') {
                    loadAndInject();
                }
            }
        }
      )
      .subscribe();

    return () => {
      cleanup();
      subscription.unsubscribe();
    };
  }, []);

  const cleanup = () => {
    injectedNodes.current.forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    injectedNodes.current = [];
  };

  const loadAndInject = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['tracking_head_snippets', 'tracking_body_snippets']);

      if (error) throw error;

      cleanup(); // Remove existing before re-injecting

      const headSnippets: TrackingSnippet[] = [];
      const bodySnippets: TrackingSnippet[] = [];

      data?.forEach((row: any) => {
        if (row.setting_key === 'tracking_head_snippets') {
          headSnippets.push(...(Array.isArray(row.setting_value) ? row.setting_value : []));
        } else if (row.setting_key === 'tracking_body_snippets') {
          bodySnippets.push(...(Array.isArray(row.setting_value) ? row.setting_value : []));
        }
      });

      // Inject Head
      injectSnippets(headSnippets, document.head, false);
      
      // Inject Body
      injectSnippets(bodySnippets, document.body, true);

    } catch (err) {
      console.error('Failed to inject tracking scripts', err);
    }
  };

  const injectSnippets = (snippets: TrackingSnippet[], container: HTMLElement, prepend: boolean) => {
    // Sort by order_index
    const sorted = [...snippets].sort((a, b) => a.order_index - b.order_index);

    // Filter enabled
    const enabled = sorted.filter(s => s.enabled);

    // For prepend (Body), we need to insert them in reverse order so the first one ends up at the top
    const toInsert = prepend ? [...enabled].reverse() : enabled;

    toInsert.forEach((snippet) => {
      if (snippet.code.toLowerCase().includes('<html') || snippet.code.toLowerCase().includes('<body')) {
        console.warn(`Skipping snippet ${snippet.name} due to forbidden tags.`);
        return;
      }

      try {
        const range = document.createRange();
        range.selectNode(container); // Context
        const fragment = range.createContextualFragment(snippet.code);
        
        const nodes = Array.from(fragment.childNodes);
        const processedNodes: Node[] = [];

        nodes.forEach((node) => {
           let finalNode = node;
           // Re-create scripts to ensure execution
           if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SCRIPT') {
               const oldScript = node as HTMLScriptElement;
               const newScript = document.createElement('script');
               Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
               newScript.textContent = oldScript.textContent;
               finalNode = newScript;
           }
           processedNodes.push(finalNode);
        });

        // Insert
        if (prepend) {
            // If we are prepending multiple nodes from one snippet, we need to preserve their relative order
            // fragment: [A, B, C] -> Prepend C, then B, then A? No.
            // insertBefore(A, firstChild) -> Body: A...
            // insertBefore(B, firstChild) -> Body: B, A... (Wrong if snippet was AB)
            // So for a single snippet's nodes, we must append them to each other or insert them in reverse?
            // Correct: Insert A at top. Insert B after A? 
            // Easier: Insert the whole fragment at top? 
            // But I processed nodes into an array (new scripts).
            
            // To maintain [A, B, C] at top of body:
            // Insert C at top. Body: C...
            // Insert B at top. Body: B, C...
            // Insert A at top. Body: A, B, C...
            // So we iterate processedNodes in reverse.
            
            for (let i = processedNodes.length - 1; i >= 0; i--) {
                const node = processedNodes[i];
                container.insertBefore(node, container.firstChild);
                injectedNodes.current.push(node);
            }
        } else {
            processedNodes.forEach(node => {
                container.appendChild(node);
                injectedNodes.current.push(node);
            });
        }

      } catch (e) {
        console.error(`Failed to inject snippet ${snippet.name}`, e);
      }
    });
  };

  return null;
}
