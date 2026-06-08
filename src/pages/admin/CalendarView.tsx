import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Booking {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  customer_name: string;
  number_of_players: number;
  booking_status: string;
  approval_status: string;
  games: { name: string } | null;
  lobby_games: { name: string } | null;
  booking_types: { name: string } | null;
}

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);

  const toLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadBookings();
  }, [currentDate]);

  const loadBookings = async () => {
    try {
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const firstDayKey = toLocalDateKey(firstDay);
      const lastDayKey = toLocalDateKey(lastDay);

      const { data, error } = await supabase
        .from('bookings')
        .select('*, games(name), lobby_games(name), booking_types(name)')
        .gte('booking_date', firstDayKey)
        .lte('booking_date', lastDayKey)
        .order('start_time');

      if (error) throw error;
      setBookings(data || []);

      if (import.meta.env.DEV) {
        console.log('[CalendarView] timezoneOffsetMinutes', new Date().getTimezoneOffset());
        console.log('[CalendarView] range', {
          firstDayLocal: firstDay.toString(),
          firstDayKey,
          firstDayISO: firstDay.toISOString(),
          lastDayLocal: lastDay.toString(),
          lastDayKey,
          lastDayISO: lastDay.toISOString(),
        });
        console.log('[CalendarView] bookings sample', (data || []).slice(0, 5).map((b: any) => ({
          id: b.id,
          booking_date: b.booking_date,
          start_time: b.start_time,
        })));
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getBookingsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = toLocalDateKey(date);
    return bookings.filter((b) => b.booking_date === dateStr);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: Date | null) => {
    if (!date) return;
    if (import.meta.env.DEV) {
      const dateKey = toLocalDateKey(date);
      console.log('[CalendarView] date click', {
        clickedLocal: date.toString(),
        clickedKey: dateKey,
        clickedISO: date.toISOString(),
        matchedBookingDates: bookings.filter((b) => b.booking_date === dateKey).map((b) => b.booking_date),
      });
    }
    setSelectedDate(date);
    setSelectedBookings(getBookingsForDate(date));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Calendar View</h1>
          <p className="text-slate-300 mt-1">Overview of all bookings by date</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h2 className="text-xl font-bold text-slate-900">{monthName}</h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-semibold text-slate-600 py-2"
              >
                {day}
              </div>
            ))}

            {days.map((date, index) => {
              const dayBookings = getBookingsForDate(date);
              const isToday =
                date?.toDateString() === new Date().toDateString();
              const isSelected =
                selectedDate && date?.toDateString() === selectedDate.toDateString();

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={`
                    min-h-24 p-2 border rounded-lg transition-all cursor-pointer
                    ${!date ? 'bg-slate-50 cursor-default' : 'hover:border-orange-300 hover:shadow-sm'}
                    ${isToday ? 'border-blue-500 bg-orange-50' : 'border-slate-200'}
                    ${isSelected ? 'ring-2 ring-blue-500 bg-orange-50' : ''}
                  `}
                >
                  {date && (
                    <>
                      <div
                        className={`text-sm font-semibold mb-1 ${
                          isToday ? 'text-primary-600' : 'text-slate-700'
                        }`}
                      >
                        {date.getDate()}
                      </div>
                      {dayBookings.length > 0 && (
                        <div className="space-y-1">
                          {dayBookings.slice(0, 2).map((booking) => {
                            const gameName = booking.games?.name || booking.lobby_games?.name || 'No Game';
                            return (
                              <div
                                key={booking.id}
                                className={`text-xs p-1 rounded truncate ${
                                  booking.approval_status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : booking.approval_status === 'pending'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                                title={`${booking.customer_name} - ${gameName}`}
                              >
                                {booking.start_time} - {gameName}
                              </div>
                            );
                          })}
                          {dayBookings.length > 2 && (
                            <div className="text-xs text-slate-600 font-medium">
                              +{dayBookings.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span className="text-sm text-slate-600">Approved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
              <span className="text-sm text-slate-600">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span className="text-sm text-slate-600">Rejected</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarIcon className="w-5 h-5 text-primary-500" />
            <h3 className="text-lg font-bold text-slate-900">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Select a date'}
            </h3>
          </div>

          {selectedDate && selectedBookings.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No bookings on this date</p>
            </div>
          )}

          {selectedBookings.length > 0 && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {selectedBookings.map((booking) => {
                const gameName = booking.games?.name || booking.lobby_games?.name || 'No Game';
                return (
                  <div
                    key={booking.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-slate-900">
                          {booking.customer_name}
                        </div>
                        <div className="text-sm text-slate-600">{gameName}</div>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          booking.approval_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : booking.approval_status === 'pending'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.approval_status}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-slate-600">
                      <div>Time: {booking.start_time}</div>
                      <div>Type: {booking.booking_types?.name || 'N/A'}</div>
                      <div>Players: {booking.number_of_players}</div>
                      <div className="font-mono text-xs text-slate-500">
                        #{booking.booking_number}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
