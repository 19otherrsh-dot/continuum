import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActivityDTO, CompanyDTO, ContactDTO } from '@continuum/shared';
import { Search } from 'lucide-react';
import { useDebounced, useFetch } from '../lib/hooks';
import { Timeline } from '../components/Timeline';
import { Drawer, Empty, SourceBadge, Spinner, TimeAgo } from '../components/ui';

export function Contacts() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const [openId, setOpenId] = useState<string | null>(params.get('focus'));

  const contacts = useFetch<{ data: ContactDTO[]; total: number }>(
    `/contacts?pageSize=100${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}`,
    [debounced],
  );

  return (
    <>
      <div className="page-header spread">
        <div>
          <h1>Contacts</h1>
          <div className="small muted">
            {contacts.data?.total ?? 0} people — most added by capture, not by typing
          </div>
        </div>
        <div className="row" style={{ width: 260 }}>
          <Search size={15} className="muted" />
          <input
            placeholder="Filter…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {contacts.loading && !contacts.data ? (
        <Spinner />
      ) : (contacts.data?.data.length ?? 0) === 0 ? (
        <Empty title="No contacts" hint="Connect a mailbox and they will appear on their own." />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Title</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {contacts.data?.data.map((contact) => (
                <tr
                  key={contact.id}
                  className="clickable"
                  onClick={() => {
                    setOpenId(contact.id);
                    setParams({ focus: contact.id });
                  }}
                >
                  <td>
                    <div style={{ fontWeight: 500 }}>{contact.fullName}</div>
                    <div className="small muted">{contact.email}</div>
                  </td>
                  <td className="muted">{contact.company?.name ?? '—'}</td>
                  <td className="muted">{contact.title ?? '—'}</td>
                  <td>
                    <SourceBadge source={contact.source} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactDrawer
        contactId={openId}
        onClose={() => {
          setOpenId(null);
          setParams({});
        }}
      />
    </>
  );
}

function ContactDrawer({ contactId, onClose }: { contactId: string | null; onClose: () => void }) {
  const contact = useFetch<ContactDTO>(contactId ? `/contacts/${contactId}` : null, [contactId]);
  const activities = useFetch<{ data: ActivityDTO[] }>(
    contactId ? `/contacts/${contactId}/activities` : null,
    [contactId],
  );

  if (!contactId) return null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={contact.data?.fullName ?? 'Contact'}
      subtitle={contact.data?.email}
    >
      {contact.data && (
        <>
          <div className="card" style={{ padding: 14 }}>
            <div className="row wrap" style={{ gap: 16 }}>
              <div>
                <div className="small muted">Company</div>
                <strong>{contact.data.company?.name ?? '—'}</strong>
              </div>
              <div>
                <div className="small muted">Title</div>
                <strong>{contact.data.title ?? '—'}</strong>
              </div>
              <div>
                <div className="small muted">Record source</div>
                <SourceBadge source={contact.data.source} />
              </div>
            </div>
            {contact.data.excluded && (
              <div className="banner small" style={{ marginTop: 12 }}>
                Capture is excluded for this sender. Nothing new from them is being ingested.
              </div>
            )}
          </div>

          <div className="col">
            <h3>Timeline</h3>
            <Timeline activities={activities.data?.data ?? []} />
          </div>
        </>
      )}
    </Drawer>
  );
}

export function Companies() {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const companies = useFetch<{ data: CompanyDTO[]; total: number }>(
    `/companies?pageSize=100${debounced ? `&q=${encodeURIComponent(debounced)}` : ''}`,
    [debounced],
  );

  return (
    <>
      <div className="page-header spread">
        <div>
          <h1>Companies</h1>
          <div className="small muted">{companies.data?.total ?? 0} accounts</div>
        </div>
        <div className="row" style={{ width: 260 }}>
          <Search size={15} className="muted" />
          <input
            placeholder="Filter…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {companies.loading && !companies.data ? (
        <Spinner />
      ) : (companies.data?.data.length ?? 0) === 0 ? (
        <Empty title="No companies" />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Domain</th>
                <th>Source</th>
                <th>Added</th>
              </tr>
            </thead>
            <tbody>
              {companies.data?.data.map((company) => (
                <tr key={company.id}>
                  <td style={{ fontWeight: 500 }}>{company.name}</td>
                  <td className="muted mono">{company.domain ?? '—'}</td>
                  <td>
                    <SourceBadge source={company.source} />
                  </td>
                  <td className="small muted">
                    <TimeAgo iso={company.createdAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
