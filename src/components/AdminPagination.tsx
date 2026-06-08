import { ChevronLeft, ChevronRight } from 'lucide-react';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function AdminPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: AdminPaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm text-slate-400">
      <div className="flex items-center gap-4">
        <span>
          Showing <span className="font-medium text-white">{totalItems > 0 ? startItem : 0}</span> to{' '}
          <span className="font-medium text-white">{endItem}</span> of{' '}
          <span className="font-medium text-white">{totalItems}</span>
        </span>
        
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-black/30 border border-red-900/30 rounded-lg px-2 py-1 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/60"
          >
            <option value={12}>12</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-transparent hover:bg-black/30 hover:border-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Logic to show a window of pages around current page
            let pageNum = i + 1;
            if (totalPages > 5) {
              if (currentPage > 3) {
                 pageNum = currentPage - 2 + i;
              }
              if (pageNum > totalPages) {
                pageNum = totalPages - 4 + i;
              }
            }
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                  currentPage === pageNum
                    ? 'bg-primary-600 text-white shadow-red-glow'
                    : 'hover:bg-black/30 border border-transparent hover:border-red-900/30'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-transparent hover:bg-black/30 hover:border-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
