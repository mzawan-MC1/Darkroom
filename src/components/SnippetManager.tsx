import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';

export interface TrackingSnippet {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
  order_index: number;
  placement: 'head' | 'body';
  created_at: string;
  updated_at: string;
}

interface SnippetManagerProps {
  title: string;
  description: string;
  snippets: TrackingSnippet[];
  placement: 'head' | 'body';
  onChange: (snippets: TrackingSnippet[]) => void;
}

export default function SnippetManager({ title, description, snippets, placement, onChange }: SnippetManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<Partial<TrackingSnippet>>({
    name: '',
    code: '',
    enabled: true,
  });
  const [error, setError] = useState<string | null>(null);

  const validateCode = (code: string): string | null => {
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes('</body>')) return 'Code cannot contain closing </body> tag';
    if (lowerCode.includes('</html>')) return 'Code cannot contain closing </html> tag';
    return null;
  };

  const handleSave = () => {
    if (!formState.name?.trim()) {
      setError('Name is required');
      return;
    }
    if (!formState.code?.trim()) {
      setError('Code is required');
      return;
    }

    const validationError = validateCode(formState.code);
    if (validationError) {
      setError(validationError);
      return;
    }

    const nameExists = snippets.some(
      (s) => s.name.toLowerCase() === formState.name?.trim().toLowerCase() && s.id !== editingId
    );
    if (nameExists) {
      setError('A snippet with this name already exists');
      return;
    }

    const now = new Date().toISOString();

    if (editingId) {
      // Update existing
      const updatedSnippets = snippets.map((s) =>
        s.id === editingId
          ? { ...s, ...formState, updated_at: now } as TrackingSnippet
          : s
      );
      onChange(updatedSnippets);
      setEditingId(null);
    } else {
      // Add new
      const newSnippet: TrackingSnippet = {
        id: crypto.randomUUID(),
        name: formState.name!.trim(),
        code: formState.code!,
        enabled: formState.enabled ?? true,
        order_index: snippets.length,
        placement,
        created_at: now,
        updated_at: now,
      };
      onChange([...snippets, newSnippet]);
      setIsAdding(false);
    }

    setFormState({ name: '', code: '', enabled: true });
    setError(null);
  };

  const handleEdit = (snippet: TrackingSnippet) => {
    setFormState(snippet);
    setEditingId(snippet.id);
    setIsAdding(false);
    setError(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      onChange(snippets.filter((s) => s.id !== id));
    }
  };

  const handleToggle = (id: string, enabled: boolean) => {
    onChange(snippets.map((s) => (s.id === id ? { ...s, enabled } : s)));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === snippets.length - 1)
    ) {
      return;
    }

    const newSnippets = [...snippets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newSnippets[index], newSnippets[targetIndex]] = [newSnippets[targetIndex], newSnippets[index]];
    
    // Update order_index
    newSnippets.forEach((s, i) => s.order_index = i);
    
    onChange(newSnippets);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setFormState({ name: '', code: '', enabled: true });
              setError(null);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Snippet
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g. Google Analytics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code</label>
            <textarea
              value={formState.code}
              onChange={(e) => setFormState({ ...formState, code: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              placeholder={`<script>\n  // Your code here\n</script>`}
            />
            {formState.code && (formState.code.includes('<html') || formState.code.includes('<body') || formState.code.includes('<head')) && (
               <div className="mt-2 flex items-start gap-2 text-amber-600 text-xs">
                 <AlertTriangle className="w-4 h-4 shrink-0" />
                 <span>Warning: Avoid including &lt;html&gt;, &lt;head&gt;, or &lt;body&gt; tags. Just include the script/style tags or content directly.</span>
               </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled-checkbox"
              checked={formState.enabled}
              onChange={(e) => setFormState({ ...formState, enabled: e.target.checked })}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="enabled-checkbox" className="text-sm text-slate-700">Enable this snippet</label>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
                setError(null);
              }}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <SaveIcon className="w-4 h-4" />
              {editingId ? 'Update Snippet' : 'Save Snippet'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {snippets.length === 0 && !isAdding && (
          <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-sm">
            No snippets added yet.
          </div>
        )}
        {snippets.map((snippet, index) => (
          <div
            key={snippet.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              snippet.enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-75'
            }`}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMove(index, 'up')}
                disabled={index === 0}
                className="text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleMove(index, 'down')}
                disabled={index === snippets.length - 1}
                className="text-slate-400 hover:text-primary-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-slate-900 truncate">{snippet.name}</h4>
                {!snippet.enabled && (
                  <span className="px-1.5 py-0.5 text-xs bg-slate-200 text-slate-600 rounded">Disabled</span>
                )}
              </div>
              <div className="text-xs text-slate-500 truncate font-mono mt-0.5">
                {snippet.code.slice(0, 60)}{snippet.code.length > 60 ? '...' : ''}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(snippet.id, !snippet.enabled)}
                className={`p-1.5 rounded-lg transition-colors ${
                  snippet.enabled
                    ? 'text-green-600 hover:bg-green-50'
                    : 'text-slate-400 hover:bg-slate-100'
                }`}
                title={snippet.enabled ? 'Disable' : 'Enable'}
              >
                {snippet.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handleEdit(snippet)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(snippet.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
