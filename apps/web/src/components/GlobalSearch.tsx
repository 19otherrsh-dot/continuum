import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResultDTO } from '@continuum/shared';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { useDebounced } from '../lib/hooks';

const ROUTE: Record<string, string> = {
  CONTACT: '/contacts',
  COMPANY: '/companies',
  DEAL: '/pipeline',
  PROJECT: '/projects',
};

/** Cross-record search (FR-SEARCH-01), including matches inside activity summaries. */
export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debounced = useDebounced(query);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<{ data: SearchResultDTO[] }>(`/search?q=${encodeURIComponent(debounced)}`)
      .then((response) => {
        if (!cancelled) {
          setResults(response.data);
          setActive(0);
        }
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  if (!open) return null;

  const go = (result: SearchResultDTO) => {
    const base = ROUTE[result.entityType] ?? '/pipeline';
    navigate(`${base}?focus=${result.id}`);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="row" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <Search size={16} className="muted" />
          <input
            ref={inputRef}
            value={query}
            placeholder="Search contacts, companies, deals, and what was said…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (event.key === 'Enter' && results[active]) {
                go(results[active]);
              } else if (event.key === 'Escape') {
                onClose();
              }
            }}
            style={{ border: 'none', outline: 'none', padding: 0 }}
          />
          {loading && <span className="spinner" />}
        </div>

        <div style={{ overflowY: 'auto' }}>
          {results.map((result, index) => (
            <div
              key={`${result.entityType}-${result.id}`}
              className={`search-result ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => go(result)}
            >
              <span className="chip chip-human">{result.entityType.toLowerCase()}</span>
              <div className="grow">
                <div style={{ fontWeight: 500 }}>{result.title}</div>
                {result.subtitle && <div className="small muted truncate">{result.subtitle}</div>}
              </div>
            </div>
          ))}

          {query.trim().length >= 2 && results.length === 0 && !loading && (
            <div className="empty small">No matches for “{query}”.</div>
          )}
          {query.trim().length < 2 && (
            <div className="empty small">
              Search across every record — including terms that only appear inside a captured
              email or call.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
