import { useState } from 'react';
import { FileText, Layout } from 'lucide-react';
import BlogManagement from './cms/BlogManagement';
import StaticPagesManagement from './cms/StaticPagesManagement';

export default function CMSManagement() {
  const [activeTab, setActiveTab] = useState<'blogs' | 'pages'>('blogs');

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">Content Management</h3>
        <p className="text-slate-300 mt-1">Manage your website content, blogs, and pages</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('blogs')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'blogs'
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-black/50 text-slate-400 hover:bg-slate-900 border border-red-900/30 hover:border-primary-500/50'
          }`}
        >
          <FileText className="w-5 h-5" />
          Blog Posts
        </button>
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
            activeTab === 'pages'
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-black/50 text-slate-400 hover:bg-slate-900 border border-red-900/30 hover:border-primary-500/50'
          }`}
        >
          <Layout className="w-5 h-5" />
          Static Pages
        </button>
      </div>

      {activeTab === 'blogs' && <BlogManagement />}
      {activeTab === 'pages' && <StaticPagesManagement />}
    </div>
  );
}
