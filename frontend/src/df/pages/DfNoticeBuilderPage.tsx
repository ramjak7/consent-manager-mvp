import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@api/client';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { ErrorMessage } from '@components/common/ErrorMessage';

interface ConsentNotice {
  noticeId: string;
  orgId: string;
  title: string;
  slug: string;
  version: number;
  description: string | null;
  content: Record<string, { title: string; body: string; summary?: string }>;
  purposes: string[];
  dataCategories: string[];
  retentionDays: number | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
};

export function DfNoticeBuilderPage() {
  const [notices, setNotices] = useState<ConsentNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<ConsentNotice | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [contentSummary, setContentSummary] = useState('');
  const [language, setLanguage] = useState('en');
  const [purposes, setPurposes] = useState('');
  const [dataCategories, setDataCategories] = useState('');
  const [retentionDays, setRetentionDays] = useState(2555);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get('/api/v1/notices');
      setNotices(data.data || []);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setDescription('');
    setContentTitle('');
    setContentBody('');
    setContentSummary('');
    setLanguage('en');
    setPurposes('');
    setDataCategories('');
    setRetentionDays(2555);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await apiClient.post('/api/v1/admin/notices', {
        title,
        slug,
        description: description || undefined,
        content: {
          [language]: {
            title: contentTitle,
            body: contentBody,
            summary: contentSummary || undefined,
          },
        },
        purposes: purposes ? purposes.split(',').map(s => s.trim()) : [],
        dataCategories: dataCategories ? dataCategories.split(',').map(s => s.trim()) : [],
        retentionDays: retentionDays || undefined,
      });
      toast.success('Notice created successfully');
      resetForm();
      setShowForm(false);
      fetchNotices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create notice');
    } finally {
      setCreating(false);
    }
  };

  const handlePublish = async (noticeId: string) => {
    try {
      await apiClient.post(`/api/v1/admin/notices/${noticeId}/publish`);
      toast.success('Notice published successfully');
      fetchNotices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to publish notice');
    }
  };

  const handleDelete = async (noticeId: string) => {
    try {
      await apiClient.delete(`/api/v1/admin/notices/${noticeId}`);
      toast.success('Notice deleted');
      fetchNotices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete notice');
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading notices..." />;
  if (error) return <ErrorMessage error={error} retry={fetchNotices} fullScreen />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notice Builder</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage consent notices — DPDP §6 informed consent
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Notice'}
        </button>
      </div>

      {showForm && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Create Consent Notice</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)} required
                  placeholder="Privacy Notice" className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text" value={slug} onChange={e => setSlug(e.target.value)} required
                  placeholder="privacy-notice" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input w-full"
                />
                <p className="text-xs text-gray-400 mt-1">Lowercase, hyphens only. Used in SDK.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text" value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of this notice" className="input w-full"
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Content ({language.toUpperCase()})
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Title</label>
                  <input
                    type="text" value={contentTitle} onChange={e => setContentTitle(e.target.value)} required
                    placeholder="Your Privacy Matters" className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary (shown first)</label>
                  <textarea
                    value={contentSummary} onChange={e => setContentSummary(e.target.value)}
                    placeholder="Brief summary of data collection practices..." rows={2} className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Notice Body</label>
                  <textarea
                    value={contentBody} onChange={e => setContentBody(e.target.value)} required
                    placeholder="Complete notice text..." rows={5} className="input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purposes (comma-separated)</label>
                <input
                  type="text" value={purposes} onChange={e => setPurposes(e.target.value)}
                  placeholder="marketing, analytics" className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Categories</label>
                <input
                  type="text" value={dataCategories} onChange={e => setDataCategories(e.target.value)}
                  placeholder="email, phone, name" className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Retention (days)</label>
                <input
                  type="number" value={retentionDays} onChange={e => setRetentionDays(parseInt(e.target.value))}
                  min={1} max={36500} className="input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={creating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notice detail view */}
      {selectedNotice && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{selectedNotice.title}</h3>
            <button onClick={() => setSelectedNotice(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-gray-500">Slug:</span> <code className="bg-gray-100 px-2 py-0.5 rounded">{selectedNotice.slug}</code></div>
            <div><span className="text-gray-500">Version:</span> {selectedNotice.version}</div>
            <div><span className="text-gray-500">Status:</span> <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedNotice.status]}`}>{selectedNotice.status}</span></div>
            <div><span className="text-gray-500">Retention:</span> {selectedNotice.retentionDays || 'N/A'} days</div>
          </div>
          {Object.entries(selectedNotice.content).map(([lang, content]) => (
            <div key={lang} className="border rounded-lg p-4 mb-3">
              <h4 className="text-sm font-medium text-gray-500 mb-2">{lang.toUpperCase()}</h4>
              <h5 className="font-medium">{content.title}</h5>
              {content.summary && <p className="text-sm text-gray-600 mt-1">{content.summary}</p>}
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{content.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Notices table */}
      {notices.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📄</div>
          <h3 className="text-lg font-medium text-gray-900">No notices yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first consent notice to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Languages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notices.map((notice) => (
                <tr key={notice.noticeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    <button onClick={() => setSelectedNotice(notice)} className="hover:text-indigo-600">
                      {notice.title}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{notice.slug}</code>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">v{notice.version}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[notice.status]}`}>
                      {notice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {Object.keys(notice.content).join(', ').toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {notice.status === 'draft' && (
                      <>
                        <button onClick={() => handlePublish(notice.noticeId)}
                          className="text-green-600 hover:text-green-800 font-medium">
                          Publish
                        </button>
                        <button onClick={() => handleDelete(notice.noticeId)}
                          className="text-red-600 hover:text-red-800 font-medium">
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
