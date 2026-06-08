import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, Calendar, Search, Filter, Edit3, Eye, CheckCircle, XCircle, Clock3, MessageCircle } from 'lucide-react';
import AdminPagination from '../../components/AdminPagination';

interface ContactMessage {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'closed';
  admin_notes: string | null;
  created_at: string;
}

export default function ContactMessagesManagement() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchMessages();
  }, [currentPage, pageSize, searchTerm, statusFilter]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm((prev) => (prev === searchInput ? prev : searchInput));
      setCurrentPage((prev) => (prev === 1 ? prev : 1));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('contact_messages')
        .select('*', { count: 'exact' });

      // Apply Search
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      // Apply Status Filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply Pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      
      setTotalItems(count || 0);
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching contact messages:', error);
      alert('Error loading contact messages');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'closed': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Mail className="w-4 h-4" />;
      case 'in_progress': return <Clock3 className="w-4 h-4" />;
      case 'closed': return <CheckCircle className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  // Client-side filtering removed
  // const filteredMessages = ...

  const openEditModal = (message: ContactMessage) => {
    setSelectedMessage(message);
    setAdminNotes(message.admin_notes || '');
    setNewStatus(message.status);
    setShowModal(true);
  };

  const updateMessage = async () => {
    if (!selectedMessage) return;

    try {
      const { error } = await (supabase
        .from('contact_messages') as any)
        .update({
          status: newStatus,
          admin_notes: adminNotes,
        })
        .eq('id', selectedMessage.id);

      if (error) throw error;

      await fetchMessages();
      setShowModal(false);
      setSelectedMessage(null);
      alert('Message updated successfully');
    } catch (error) {
      console.error('Error updating message:', error);
      alert('Error updating message');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contact Messages</h1>
          <p className="text-slate-400 mt-1">Manage contact form messages from customers</p>
        </div>
        <div className="text-sm text-slate-400">
          Total: {totalItems} messages
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, subject, or message..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-8 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-slate-400">
          Loading messages...
        </div>
      )}

      {/* Messages List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {messages.map((message) => (
                <tr key={message.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/20 border border-primary-500/30 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary-400" />
                      </div>
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-white truncate">
                          {message.subject}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-2">
                          {message.message}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {message.full_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {message.email}
                      </div>
                      {message.phone && (
                        <div className="text-xs text-slate-400">
                          {message.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(message.status)}`}>
                      {getStatusIcon(message.status)}
                      {message.status.replace('_', ' ').charAt(0).toUpperCase() + message.status.slice(1).replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(message.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(message)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Edit Message"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedMessage(message)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={`mailto:${message.email}?subject=Re: ${message.subject}`}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Reply via Email"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No contact messages found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <AdminPagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / pageSize)}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Edit Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Update Contact Message</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add notes about this message..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={updateMessage}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
              >
                Update Message
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedMessage && !showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Message Details</h3>
              <button
                onClick={() => setSelectedMessage(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">From</label>
                <p className="text-white">{selectedMessage.full_name}</p>
                <p className="text-slate-400 text-sm">{selectedMessage.email}</p>
                {selectedMessage.phone && <p className="text-slate-400 text-sm">{selectedMessage.phone}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
                <p className="text-white">{selectedMessage.subject}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
                <div className="text-white text-sm bg-slate-800 p-3 rounded-lg max-h-32 overflow-y-auto">
                  {selectedMessage.message}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedMessage.status)}`}>
                  {getStatusIcon(selectedMessage.status)}
                  {selectedMessage.status.replace('_', ' ').charAt(0).toUpperCase() + selectedMessage.status.slice(1).replace('_', ' ')}
                </span>
              </div>
              
              {selectedMessage.admin_notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Admin Notes</label>
                  <p className="text-white text-sm">{selectedMessage.admin_notes}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Created</label>
                  <p className="text-white text-sm">{new Date(selectedMessage.created_at).toLocaleString()}</p>
                </div>
                
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                className="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors text-center"
              >
                Reply via Email
              </a>
              <button
                onClick={() => openEditModal(selectedMessage)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
              >
                Edit Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
