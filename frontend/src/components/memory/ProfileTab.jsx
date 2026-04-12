import { useState, useEffect } from 'react'
import { User, Settings, Target, Pin, Sparkles, Trash2, Edit3, Check, X } from 'lucide-react'
import { profileAPI } from '../../services/api'
import ProfileSection from './ProfileSection'

function ProfileTab({ onProfileUpdate }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const res = await profileAPI.get()
      setProfile(res.data)
      setNameValue(res.data.name || '')
      if (onProfileUpdate) {
        const itemCount = countProfileItems(res.data)
        onProfileUpdate(itemCount, res.data.updated_at)
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const countProfileItems = (p) => {
    if (!p) return 0
    return (p.name ? 1 : 0) +
           (p.preferences?.length || 0) +
           (p.interests?.length || 0) +
           (p.personal_facts?.length || 0)
  }

  const updateProfile = async (updates) => {
    try {
      const res = await profileAPI.update(updates)
      setProfile(res.data)
      if (onProfileUpdate) {
        const itemCount = countProfileItems(res.data)
        onProfileUpdate(itemCount, res.data.updated_at)
      }
    } catch (err) {
      console.error('Failed to update profile:', err)
    }
  }

  const handleNameSave = async () => {
    await updateProfile({ name: nameValue.trim() || null })
    setEditingName(false)
  }

  const handleAddItem = (field) => async (value) => {
    const current = profile[field] || []
    await updateProfile({ [field]: [...current, value] })
  }

  const handleRemoveItem = (field) => async (index) => {
    const current = profile[field] || []
    const updated = current.filter((_, i) => i !== index)
    await updateProfile({ [field]: updated })
  }

  const handleClearProfile = async () => {
    if (!confirm('Clear all profile data? This cannot be undone.')) return
    try {
      const res = await profileAPI.clear()
      setProfile(res.data.profile)
      setNameValue('')
      if (onProfileUpdate) {
        onProfileUpdate(0, null)
      }
    } catch (err) {
      console.error('Failed to clear profile:', err)
    }
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-12">Loading profile...</div>
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
        <button onClick={fetchProfile} className="mt-2 text-neon-cyan hover:underline">
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">About You</h2>
          <p className="text-sm text-gray-400">The AI builds this understanding over time</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan text-gray-900 text-[10px] font-medium">
            <Sparkles size={10} />
            AI-Learned
          </span>
          <button
            onClick={handleClearProfile}
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
            title="Clear all profile data"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name Section */}
        <div className="glass-card border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3 uppercase tracking-wider">
            <User size={16} className="text-neon-cyan" />
            Name
          </div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                placeholder="Your name..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm bg-surface-low border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-cyan text-gray-100 placeholder-gray-500 transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleNameSave()
                  if (e.key === 'Escape') {
                    setEditingName(false)
                    setNameValue(profile?.name || '')
                  }
                }}
              />
              <button onClick={handleNameSave} className="p-2 text-neon-cyan hover:bg-neon-cyan/10 rounded-lg transition-colors">
                <Check size={16} />
              </button>
              <button
                onClick={() => {
                  setEditingName(false)
                  setNameValue(profile?.name || '')
                }}
                className="p-2 text-gray-400 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={`text-sm ${profile?.name ? 'text-gray-200' : 'text-gray-500 italic'}`}>
                {profile?.name || 'Not yet known'}
              </span>
              <button
                onClick={() => setEditingName(true)}
                className="p-1.5 text-gray-400 hover:text-neon-cyan rounded-lg hover:bg-neon-cyan/10 transition-colors"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Preferences Section */}
        <ProfileSection
          icon={Settings}
          title="Preferences"
          items={profile?.preferences || []}
          type="list"
          onAdd={handleAddItem('preferences')}
          onRemove={handleRemoveItem('preferences')}
          emptyText="No preferences learned yet"
        />

        {/* Interests Section */}
        <ProfileSection
          icon={Target}
          title="Interests"
          items={profile?.interests || []}
          type="tags"
          onAdd={handleAddItem('interests')}
          onRemove={handleRemoveItem('interests')}
          emptyText="No interests learned yet"
        />

        {/* Personal Facts Section */}
        <ProfileSection
          icon={Pin}
          title="Known Facts"
          items={profile?.personal_facts || []}
          type="list"
          onAdd={handleAddItem('personal_facts')}
          onRemove={handleRemoveItem('personal_facts')}
          emptyText="No personal facts learned yet"
        />

        {/* Last Updated */}
        {profile?.updated_at && (
          <div className="text-xs text-gray-500 text-center pt-2">
            Last updated: {new Date(profile.updated_at).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfileTab
