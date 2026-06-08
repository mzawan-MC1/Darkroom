import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Save,
  Upload,
  X,
  Plus,
  Trash2,
  FileText,
  Star,
  Trophy,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import GameAchievementsManager from '../../components/GameAchievementsManager';

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

interface GameFeature {
  id?: string;
  title: string;
  description: string;
  icon: string;
  icon_image_url?: string;
  order_position: number;
}

interface GameFAQ {
  id?: string;
  question: string;
  answer: string;
  order_position: number;
}

interface GalleryImage {
  id?: string;
  image_url: string;
  caption: string;
  order_position: number;
}

export default function GameProfileManagement() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'features' | 'faqs' | 'gallery' | 'achievements'>('info');

  const [game, setGame] = useState<Game | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tagline: '',
    storyline: '',
    description: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    duration_minutes: 60,
    min_players: 2,
    max_players: 8,
    base_price: '',
    room_number: '',
    image_url: '',
    status: 'draft',
  });

  const [missionObjectives, setMissionObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState('');
  const [features, setFeatures] = useState<GameFeature[]>([]);
  const [faqs, setFAQs] = useState<GameFAQ[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);

  const [newFeature, setNewFeature] = useState({ title: '', description: '', icon: '' });
  const [featureIconFile, setFeatureIconFile] = useState<File | null>(null);
  const [featureIconPreview, setFeatureIconPreview] = useState<string | null>(null);
  const [newFAQ, setNewFAQ] = useState({ question: '', answer: '' });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (gameId && gameId !== 'new') {
      fetchGameData();
    } else {
      setLoading(false);
    }
  }, [gameId]);

  const fetchGameData = async () => {
    try {
      setLoading(true);

      const { data: gameData, error: gameError } = await (supabase
        .from('games') as any)
        .select('*')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;
      setGame(gameData);
      setFormData({
        name: gameData.name,
        slug: gameData.slug,
        tagline: gameData.tagline || '',
        storyline: gameData.storyline || '',
        description: gameData.description || '',
        difficulty: gameData.difficulty,
        duration_minutes: gameData.duration_minutes,
        min_players: gameData.min_players,
        max_players: gameData.max_players,
        base_price: gameData.base_price.toString(),
        room_number: gameData.room_number || '',
        image_url: gameData.image_url || '',
        status: gameData.status,
      });
      setMissionObjectives(gameData.mission_objectives || []);
      setImagePreview(gameData.image_url || null);

      const [featuresRes, faqsRes, galleryRes] = await Promise.all([
        (supabase.from('game_features') as any).select('*').eq('game_id', gameId).order('order_position'),
        (supabase.from('game_faqs') as any).select('*').eq('game_id', gameId).order('order_position'),
        (supabase.from('game_gallery') as any).select('*').eq('game_id', gameId).order('order_position'),
      ]);

      setFeatures(featuresRes.data || []);
      setFAQs(faqsRes.data || []);
      setGallery(galleryRes.data || []);

    } catch (error) {
      console.error('Error fetching game data:', error);
      alert('Failed to load game data');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleSaveGameInfo = async () => {
    try {
      setSaving(true);

      if (!formData.name.trim()) {
        alert('Game name is required');
        return;
      }

      if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
        alert('Base price is required and must be greater than 0');
        return;
      }

      let imageUrl = formData.image_url || null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `games/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const gameData = {
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        tagline: formData.tagline || null,
        storyline: formData.storyline || null,
        description: formData.description || null,
        mission_objectives: missionObjectives.length > 0 ? missionObjectives : null,
        difficulty: formData.difficulty,
        duration_minutes: formData.duration_minutes,
        min_players: formData.min_players,
        max_players: formData.max_players,
        base_price: parseFloat(formData.base_price),
        room_number: formData.room_number || null,
        image_url: imageUrl,
        status: formData.status,
      };

      if (gameId === 'new') {
        const { data, error } = await (supabase
          .from('games') as any)
          .insert([gameData])
          .select()
          .single();

        if (error) throw error;
        alert('Game created successfully!');
        navigate(`/admin/game-profile/${data.id}`);
      } else {
        const { error } = await (supabase
          .from('games') as any)
          .update(gameData)
          .eq('id', gameId);

        if (error) throw error;
        alert('Game information saved successfully!');
        setImageFile(null);
        fetchGameData();
      }
    } catch (error: any) {
      console.error('Error saving game info:', error);
      alert(error.message || 'Failed to save game info');
    } finally {
      setSaving(false);
    }
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setMissionObjectives([...missionObjectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const removeObjective = (index: number) => {
    setMissionObjectives(missionObjectives.filter((_, i) => i !== index));
  };

  const handleAddFeature = async () => {
    if (!newFeature.title.trim()) return;
    if (gameId === 'new') {
      alert('Please save the game first before adding features');
      return;
    }

    try {
      let iconImageUrl = null;

      if (featureIconFile) {
        const fileExt = featureIconFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `feature-icons/${gameId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, featureIconFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        iconImageUrl = publicUrl;
      }

      const { error } = await (supabase
        .from('game_features') as any)
        .insert([{
          game_id: gameId,
          title: newFeature.title.trim(),
          description: newFeature.description.trim(),
          icon: newFeature.icon.trim(),
          icon_image_url: iconImageUrl,
          order_position: features.length,
        }]);

      if (error) throw error;
      setNewFeature({ title: '', description: '', icon: '' });
      setFeatureIconFile(null);
      setFeatureIconPreview(null);
      fetchGameData();
      alert('Feature added successfully!');
    } catch (error: any) {
      console.error('Error adding feature:', error);
      alert(error.message || 'Failed to add feature');
    }
  };

  const handleDeleteFeature = async (id: string) => {
    if (!confirm('Delete this feature?')) return;

    try {
      const { error } = await (supabase
        .from('game_features') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGameData();
      alert('Feature deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting feature:', error);
      alert(error.message || 'Failed to delete feature');
    }
  };

  const handleAddFAQ = async () => {
    if (!newFAQ.question.trim() || !newFAQ.answer.trim()) return;
    if (gameId === 'new') {
      alert('Please save the game first before adding FAQs');
      return;
    }

    try {
      const { error } = await (supabase
        .from('game_faqs') as any)
        .insert([{
          game_id: gameId,
          question: newFAQ.question.trim(),
          answer: newFAQ.answer.trim(),
          order_position: faqs.length,
        }]);

      if (error) throw error;
      setNewFAQ({ question: '', answer: '' });
      fetchGameData();
      alert('FAQ added successfully!');
    } catch (error: any) {
      console.error('Error adding FAQ:', error);
      alert(error.message || 'Failed to add FAQ');
    }
  };

  const handleDeleteFAQ = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;

    try {
      const { error } = await (supabase
        .from('game_faqs') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGameData();
      alert('FAQ deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      alert(error.message || 'Failed to delete FAQ');
    }
  };

  const handleUploadGalleryImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (gameId === 'new') {
      alert('Please save the game first before uploading gallery images');
      return;
    }

    try {
      setUploadingImages(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `game-gallery/${gameId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        const { error } = await (supabase
          .from('game_gallery') as any)
          .insert([{
            game_id: gameId,
            image_url: publicUrl,
            caption: '',
            order_position: gallery.length + i,
          }]);

        if (error) throw error;
      }

      fetchGameData();
      alert(`${files.length} image(s) uploaded successfully!`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      alert(error.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    if (!confirm('Delete this image?')) return;

    try {
      const { error } = await (supabase
        .from('game_gallery') as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchGameData();
      alert('Image deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting image:', error);
      alert(error.message || 'Failed to delete image');
    }
  };

  const handleUpdateGalleryCaption = async (id: string, caption: string) => {
    try {
      const { error } = await (supabase
        .from('game_gallery') as any)
        .update({ caption })
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating caption:', error);
      alert(error.message || 'Failed to update caption');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white">Loading...</div>;
  }

  if (!game && gameId !== 'new') {
    return <div className="flex items-center justify-center h-64 text-white">Game not found</div>;
  }

  const isNewGame = gameId === 'new';

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isNewGame ? 'Create New Game' : `Edit Game: ${game?.name}`}
            </h1>
            <p className="text-slate-300 mt-1">
              {isNewGame ? 'Fill in the details below to create a new game' : 'Manage all content for this game'}
            </p>
          </div>
        </div>

        <div className="bg-black/50 rounded-xl border border-red-900/30">
          <div className="flex gap-2 p-2 border-b border-red-900/30 overflow-x-auto">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'info'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Game Info
            </button>
            <button
              onClick={() => setActiveTab('features')}
              disabled={isNewGame}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'features'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${isNewGame ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isNewGame ? 'Save the game first to add features' : ''}
            >
              <Star className="w-4 h-4 inline mr-2" />
              Features ({features.length})
            </button>
            <button
              onClick={() => setActiveTab('faqs')}
              disabled={isNewGame}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'faqs'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${isNewGame ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isNewGame ? 'Save the game first to add FAQs' : ''}
            >
              <HelpCircle className="w-4 h-4 inline mr-2" />
              FAQs ({faqs.length})
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              disabled={isNewGame}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'gallery'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${isNewGame ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isNewGame ? 'Save the game first to add gallery images' : ''}
            >
              <ImageIcon className="w-4 h-4 inline mr-2" />
              Gallery ({gallery.length})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              disabled={isNewGame}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-primary-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${isNewGame ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isNewGame ? 'Save the game first to add achievements' : ''}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Achievements
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Game Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="auto-generated-from-name"
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    placeholder="A catchy one-liner for the hero section"
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="Brief overview of the game"
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Storyline</label>
                  <textarea
                    value={formData.storyline}
                    onChange={(e) => setFormData({ ...formData, storyline: e.target.value })}
                    rows={6}
                    placeholder="The complete narrative and backstory of the game"
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Mission Objectives</label>
                  <div className="space-y-2">
                    {missionObjectives.map((objective, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1 px-3 py-2 bg-black/30 border border-red-900/30 rounded-lg text-sm text-white">
                          {index + 1}. {objective}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeObjective(index)}
                          className="p-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newObjective}
                        onChange={(e) => setNewObjective(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                        placeholder="Add a mission objective..."
                        className="flex-1 px-3 py-2 bg-black/50 border border-red-900/30 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-white placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={addObjective}
                        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Difficulty *</label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration (min) *</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Min Players *</label>
                    <input
                      type="number"
                      value={formData.min_players}
                      onChange={(e) => setFormData({ ...formData, min_players: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Max Players *</label>
                    <input
                      type="number"
                      value={formData.max_players}
                      onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Base Price (AED) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Room Number</label>
                    <input
                      type="text"
                      value={formData.room_number}
                      onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-900 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-400">Only "Active" games are visible to customers</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Game Banner Image</label>
                  <div className="border-2 border-dashed border-red-900/30 rounded-lg p-6 bg-black/30">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-64 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-sm text-slate-400 mb-2">
                          Click to select an image
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="banner-upload"
                        />
                        <label
                          htmlFor="banner-upload"
                          className="inline-block px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors"
                        >
                          Choose File
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleSaveGameInfo}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : isNewGame ? 'Create Game' : 'Save Game Information'}
                </button>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Add New Feature</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newFeature.title}
                      onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
                      placeholder="Feature title..."
                      className="w-full px-4 py-2 bg-black/50 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <textarea
                      value={newFeature.description}
                      onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                      rows={3}
                      placeholder="Feature description..."
                      className="w-full px-4 py-2 bg-black/50 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Feature Icon Image</label>
                      <div className="border-2 border-dashed border-red-900/30 rounded-lg p-4 bg-black/30">
                        {featureIconPreview ? (
                          <div className="relative">
                            <img
                              src={featureIconPreview}
                              alt="Icon preview"
                              className="w-20 h-20 object-cover rounded-lg mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setFeatureIconFile(null);
                                setFeatureIconPreview(null);
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-2">Choose icon image</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setFeatureIconFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setFeatureIconPreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="hidden"
                              id="feature-icon-upload"
                            />
                            <label
                              htmlFor="feature-icon-upload"
                              className="inline-block px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 cursor-pointer transition-colors"
                            >
                              Choose Image
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={handleAddFeature}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add Feature
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {features.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No features yet. Add your first one above.
                    </div>
                  ) : (
                    features.map((feature) => (
                      <div key={feature.id} className="bg-slate-900 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3 flex-1">
                            {feature.icon_image_url ? (
                              <img src={feature.icon_image_url} alt="Feature icon" className="w-10 h-10 object-cover rounded-lg" />
                            ) : (
                              <Star className="w-5 h-5 text-primary-400" />
                            )}
                            <div className="flex-1">
                              <h4 className="text-white font-semibold">{feature.title}</h4>
                              <p className="text-slate-300 text-sm mt-1">{feature.description}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteFeature(feature.id!)}
                            className="p-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Add New FAQ</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newFAQ.question}
                      onChange={(e) => setNewFAQ({ ...newFAQ, question: e.target.value })}
                      placeholder="Question..."
                      className="w-full px-4 py-2 bg-black/50 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <textarea
                      value={newFAQ.answer}
                      onChange={(e) => setNewFAQ({ ...newFAQ, answer: e.target.value })}
                      rows={4}
                      placeholder="Answer..."
                      className="w-full px-4 py-2 bg-black/50 border border-red-900/30 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button
                      onClick={handleAddFAQ}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Add FAQ
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {faqs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      No FAQs yet. Add your first one above.
                    </div>
                  ) : (
                    faqs.map((faq) => (
                      <div key={faq.id} className="bg-slate-900 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-2 flex-1">
                            <HelpCircle className="w-5 h-5 text-primary-400 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-white font-semibold mb-2">{faq.question}</h4>
                              <p className="text-slate-300 text-sm">{faq.answer}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteFAQ(faq.id!)}
                            className="p-2 text-red-400 hover:bg-red-900/50 rounded-lg transition-colors ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-6">
                <div className="bg-slate-900 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">Upload Gallery Images</h3>
                  <div className="border-2 border-dashed border-red-900/30 rounded-lg p-6 bg-black/30 text-center">
                    <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-sm text-slate-400 mb-2">
                      Select multiple images (JPG, PNG, GIF, WebP, SVG, BMP, TIFF)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUploadGalleryImages}
                      disabled={uploadingImages}
                      className="hidden"
                      id="gallery-upload"
                    />
                    <label
                      htmlFor="gallery-upload"
                      className={`inline-block px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors ${uploadingImages ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingImages ? 'Uploading...' : 'Choose Images'}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gallery.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-slate-400">
                      No images in gallery yet. Upload your first one above.
                    </div>
                  ) : (
                    gallery.map((image) => (
                      <div key={image.id} className="bg-slate-900 rounded-lg overflow-hidden">
                        <img
                          src={image.image_url}
                          alt={image.caption}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-3">
                          <input
                            type="text"
                            value={image.caption}
                            onChange={(e) => handleUpdateGalleryCaption(image.id!, e.target.value)}
                            placeholder="Image caption..."
                            className="w-full px-3 py-2 bg-black/50 border border-red-900/30 rounded text-white text-sm mb-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          <button
                            onClick={() => handleDeleteGalleryImage(image.id!)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/50 rounded transition-colors text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div>
                <GameAchievementsManager
                  gameId={gameId!}
                  onUpdate={fetchGameData}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
