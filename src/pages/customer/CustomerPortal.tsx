import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { LogOut, Gamepad2, Users, Clock, DollarSign, Target } from 'lucide-react';
import CustomerBookingModal from '../../components/CustomerBookingModal';

interface Game {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  storyline: string | null;
  description: string | null;
  mission_objectives: string[] | null;
  difficulty: 'easy' | 'medium' | 'hard';
  duration_minutes: number;
  min_players: number;
  max_players: number;
  base_price: number;
  room_number: string | null;
  image_url: string | null;
  status: string;
}

/* interface Participant {
  full_name: string;
  phone_number: string;
  age: number;
} */

export default function CustomerPortal() {
  const { profile, signOut } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  // const [showWaiverModal, setShowWaiverModal] = useState(false);
  // const [waiverAccepted, setWaiverAccepted] = useState(false);
  // const [participants, setParticipants] = useState<Participant[]>([]);
  /* const [bookingData, setBookingData] = useState({
    booking_date: '',
    start_time: '',
    number_of_players: 2,
    customer_name: profile?.full_name || '',
    customer_email: profile?.email || '',
    customer_phone: '',
    special_requests: '',
  }); */

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    fetchGames(signal);

    const urlParams = new URLSearchParams(window.location.search);
    const gameSlug = urlParams.get('game');
    if (gameSlug) {
      fetchGameBySlug(gameSlug, signal);
    }

    return () => controller.abort();
  }, []);

  const fetchGames = async (signal?: AbortSignal) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('status', 'active')
        .order('name')
        .abortSignal(signal as AbortSignal) as any;

      if (error) throw error;
      setGames(data || []);
    } catch (error: any) {
      const isAbort = 
        error.name === 'AbortError' || 
        error.code === 20 ||
        error.code === '20' ||
        error.message?.includes('AbortError') ||
        error.message?.includes('aborted') ||
        error.details?.includes('AbortError') ||
        error.details?.includes('aborted');

      if (!isAbort) {
        console.error('Error fetching games:', error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchGameBySlug = async (slug: string, signal?: AbortSignal) => {
    try {
      const { data, error } = await (supabase
        .from('games') as any)
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()
        .abortSignal(signal as AbortSignal);

      if (error) throw error;
      if (data) setSelectedGame(data);
    } catch (error: any) {
      if (error.name !== 'AbortError' && !error.message?.includes('AbortError') && !error.message?.includes('The user aborted a request')) {
        console.error('Error fetching game:', error);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const handleOpenBookingModal = (game: Game) => {
    setSelectedGame(game);
    setShowBookingModal(true);
    /* setBookingData({
      booking_date: '',
      start_time: '',
      number_of_players: game.min_players,
      customer_name: profile?.full_name || '',
      customer_email: profile?.email || '',
      customer_phone: '',
      special_requests: '',
    });
    setParticipants([]);
    setWaiverAccepted(false); */
    // setShowBookingModal(true);
  };

  /*
  const handleAddParticipant = () => {
    setParticipants([...participants, { full_name: '', phone_number: '', age: 18 }]);
  };

  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleParticipantChange = (index: number, field: keyof Participant, value: string | number) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedGame) {
      alert('Please log in to make a booking');
      return;
    }

    if (participants.length !== bookingData.number_of_players) {
      alert(`Please add details for all ${bookingData.number_of_players} participants`);
      return;
    }

    if (!waiverAccepted) {
      alert('Please read and accept the waiver to continue');
      return;
    }

    const hasEmptyFields = participants.some(p => !p.full_name || !p.phone_number || !p.age);
    if (hasEmptyFields) {
      alert('Please fill in all participant details');
      return;
    }

    try {
      const bookingNumber = `BK${Date.now()}`;
      const endTime = calculateEndTime(bookingData.start_time, selectedGame.duration_minutes);
      const totalAmount = selectedGame.base_price * bookingData.number_of_players;

      const { data: bookingResult, error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          booking_number: bookingNumber,
          user_id: user.id,
          game_id: selectedGame.id,
          booking_date: bookingData.booking_date,
          start_time: bookingData.start_time,
          end_time: endTime,
          number_of_players: bookingData.number_of_players,
          customer_name: bookingData.customer_name,
          customer_email: bookingData.customer_email,
          customer_phone: bookingData.customer_phone,
          special_requests: bookingData.special_requests || null,
          total_amount: totalAmount,
          discount_amount: 0,
          final_amount: totalAmount,
          booking_status: 'pending',
          payment_status: 'pending',
          reminder_sent: false,
        }] as any)
        .select()
        .single();

      if (bookingError) throw bookingError;

      const participantsData = participants.map(p => ({
        booking_id: bookingResult.id,
        full_name: p.full_name,
        phone_number: p.phone_number,
        age: p.age,
        waiver_signed: true,
        waiver_signed_at: new Date().toISOString(),
      }));

      const { error: participantsError } = await supabase
        .from('booking_participants')
        .insert(participantsData as any);

      if (participantsError) throw participantsError;

      alert('Booking created successfully! Booking number: ' + bookingNumber);
      setShowBookingModal(false);
      setParticipants([]);
      setWaiverAccepted(false);
      setBookingData({
        booking_date: '',
        start_time: '',
        number_of_players: 2,
        customer_name: profile?.full_name || '',
        customer_email: profile?.email || '',
        customer_phone: '',
        special_requests: '',
      });
    } catch (error: any) {
      console.error('Error creating booking:', error);
      alert(error.message || 'Error creating booking');
    }
  };
  */

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Escape Room Dubai</h1>
              <p className="text-slate-600 mt-1">Welcome back, {profile?.full_name}!</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {selectedGame ? (
          <div className="mb-8">
            <button
              onClick={() => setSelectedGame(null)}
              className="text-primary-500 hover:text-primary-600 mb-4"
            >
              ← Back to all games
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {selectedGame.image_url && (
                <img
                  src={selectedGame.image_url}
                  alt={selectedGame.name}
                  className="w-full h-96 object-cover"
                />
              )}

              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedGame.name}</h2>
                    {selectedGame.tagline && (
                      <p className="text-lg text-primary-500 italic mb-4">{selectedGame.tagline}</p>
                    )}
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getDifficultyColor(selectedGame.difficulty)}`}>
                    {selectedGame.difficulty.charAt(0).toUpperCase() + selectedGame.difficulty.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-5 h-5" />
                    <span>{selectedGame.duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-5 h-5" />
                    <span>{selectedGame.min_players}-{selectedGame.max_players} players</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <DollarSign className="w-5 h-5" />
                    <span>AED {selectedGame.base_price}</span>
                  </div>
                </div>

                {selectedGame.description && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
                    <p className="text-slate-700">{selectedGame.description}</p>
                  </div>
                )}

                {selectedGame.storyline && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Storyline</h3>
                    <p className="text-slate-700">{selectedGame.storyline}</p>
                  </div>
                )}

                {selectedGame.mission_objectives && selectedGame.mission_objectives.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Mission Objectives
                    </h3>
                    <ul className="space-y-2">
                      {selectedGame.mission_objectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </span>
                          <span className="text-slate-700 pt-0.5">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => handleOpenBookingModal(selectedGame)}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Available Escape Rooms
              </h2>
              <p className="text-lg text-slate-600">
                Choose your adventure and book your next escape room experience
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto"></div>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-12">
                <Gamepad2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">No games available at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedGame(game)}
                  >
                    <div className="h-48 bg-slate-200">
                      {game.image_url ? (
                        <img src={game.image_url} alt={game.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gamepad2 className="w-16 h-16 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">{game.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(game.difficulty)}`}>
                          {game.difficulty}
                        </span>
                      </div>

                      {game.tagline && (
                        <p className="text-sm text-primary-500 italic mb-3">{game.tagline}</p>
                      )}

                      {game.description && (
                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{game.description}</p>
                      )}

                      <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{game.duration_minutes}m</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{game.min_players}-{game.max_players}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>AED {game.base_price}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showBookingModal && selectedGame && (
        <CustomerBookingModal
          game={selectedGame}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedGame(null);
          }}
          onBookingCreated={() => {
            setShowBookingModal(false);
            setSelectedGame(null);
          }}
        />
      )}


      {/* {showWaiverModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Waiver Agreement</h3>
                <p className="text-sm text-slate-600 mt-1">Please read carefully before accepting</p>
              </div>
              <button
                onClick={() => setShowWaiverModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="prose prose-sm max-w-none">
                <h4 className="text-lg font-semibold text-slate-900 mb-4">
                  Escape Room Dubai - Participant Waiver and Release of Liability
                </h4>

                <div className="space-y-4 text-slate-700">
                  <p>
                    By signing this waiver, I acknowledge that I am voluntarily participating in escape room activities
                    provided by Escape Room Dubai ("the Company"). I understand that these activities may involve physical
                    and mental challenges, and I assume all risks associated with participation.
                  </p>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">1. Assumption of Risk</h5>
                    <p>
                      I understand that escape room activities may include crawling, climbing, problem-solving under time
                      pressure, dim lighting, confined spaces, and other physical challenges. I acknowledge that these
                      activities carry inherent risks including but not limited to: minor injuries, bruises, psychological
                      stress, and in rare cases, more serious injuries.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">2. Health Declaration</h5>
                    <p>
                      I certify that I am in good physical and mental health and have no medical conditions that would
                      prevent me from safely participating in escape room activities. I will inform staff immediately if
                      I experience any discomfort, anxiety, or medical issues during the activity.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">3. Release of Liability</h5>
                    <p>
                      I hereby release, waive, discharge, and covenant not to sue the Company, its owners, employees,
                      volunteers, and agents from any and all liability, claims, demands, actions, and causes of action
                      whatsoever arising out of or related to any loss, damage, or injury that may be sustained by me
                      while participating in escape room activities.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">4. Rules and Guidelines</h5>
                    <p>
                      I agree to follow all safety rules, instructions, and guidelines provided by the Company's staff.
                      I understand that failure to comply may result in immediate termination of my participation without
                      refund. I will not use excessive force, vandalize property, or engage in any behavior that could
                      harm myself, other participants, or Company property.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">5. Minors</h5>
                    <p>
                      If I am signing on behalf of a minor participant, I certify that I am the parent or legal guardian
                      and have the authority to sign this waiver. I accept full responsibility for the minor's participation
                      and agree to all terms on their behalf.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">6. Photo and Video Release</h5>
                    <p>
                      I grant permission to the Company to use photographs and videos taken during my participation for
                      promotional purposes, including on social media, websites, and marketing materials.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-slate-900 mb-2">7. Acknowledgment</h5>
                    <p>
                      I have read this waiver and fully understand its contents. I voluntarily agree to its terms and
                      conditions and sign it of my own free will.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => {
                    // setWaiverAccepted(true);
                    setShowWaiverModal(false);
                  }}
                  className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
                >
                  I Accept the Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
