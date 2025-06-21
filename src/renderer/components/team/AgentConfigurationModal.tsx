/**
 * Agent Configuration Modal Component
 * 
 * Epic 3 Story 3.2: Agent Configuration and Customization
 * Comprehensive interface for customizing agent personalities and behavior
 */

import React, { useState, useEffect } from 'react'
import { useAgentStore, Agent, AgentConfiguration } from '@/renderer/stores/agentStore'
import { AgentType } from '@/shared/contracts/AgentDomain'
import { cn } from '@/renderer/utils/cn'
import { getPresetsForAgentType, applyPresetToConfiguration, ConfigurationPreset } from '@/renderer/utils/agentConfigurationPresets'

// =============================================================================
// Agent Configuration Modal Component
// =============================================================================

interface AgentConfigurationModalProps {
  agent: Agent
  isOpen: boolean
  onClose: () => void
}

export const AgentConfigurationModal: React.FC<AgentConfigurationModalProps> = ({
  agent,
  isOpen,
  onClose
}) => {
  const { 
    updateAgentConfiguration, 
    resetAgentConfiguration,
    exportAgentConfiguration,
    importAgentConfiguration 
  } = useAgentStore()
  
  const [config, setConfig] = useState<AgentConfiguration>(agent.configuration)
  const [activeTab, setActiveTab] = useState<'presets' | 'personality' | 'behavior' | 'advanced' | 'workflow'>('presets')
  const [hasChanges, setHasChanges] = useState(false)
  const [importData, setImportData] = useState('')
  const [showImportSection, setShowImportSection] = useState(false)

  // Update local config when agent changes
  useEffect(() => {
    setConfig(agent.configuration)
    setHasChanges(false)
  }, [agent])

  // Track changes
  useEffect(() => {
    const configChanged = JSON.stringify(config) !== JSON.stringify(agent.configuration)
    setHasChanges(configChanged)
  }, [config, agent.configuration])

  const handleConfigChange = (updates: Partial<AgentConfiguration>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleApplyPreset = (preset: ConfigurationPreset) => {
    const newConfig = applyPresetToConfiguration(config, preset)
    setConfig(newConfig)
  }

  const handleSave = () => {
    updateAgentConfiguration(agent.id, config)
    setHasChanges(false)
  }

  const handleReset = () => {
    resetAgentConfiguration(agent.id)
    setConfig(agent.configuration)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setConfig(agent.configuration)
    setHasChanges(false)
    onClose()
  }

  const handleExport = () => {
    const exportData = exportAgentConfiguration(agent.id)
    if (exportData) {
      // Create and download file
      const blob = new Blob([exportData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${agent.name.toLowerCase()}-config.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleImport = () => {
    try {
      const success = importAgentConfiguration(agent.id, importData)
      if (success) {
        setConfig(agent.configuration)
        setImportData('')
        setShowImportSection(false)
        setHasChanges(false)
        alert('Configuration imported successfully!')
      } else {
        alert('Failed to import configuration. Please check the format.')
      }
    } catch (error) {
      alert('Invalid configuration file format.')
    }
  }

  const getAgentTypeConfig = (type: AgentType) => {
    const configs = {
      [AgentType.PRODUCER]: {
        emoji: '👔',
        color: 'blue',
        defaultPrompt: 'You are a helpful project manager focused on facilitating development and keeping projects organized.'
      },
      [AgentType.ARCHITECT]: {
        emoji: '🏗️',
        color: 'purple',
        defaultPrompt: 'You are a technical architect focused on designing scalable and maintainable systems.'
      },
      [AgentType.ENGINEER]: {
        emoji: '⚡',
        color: 'green',
        defaultPrompt: 'You are a skilled software engineer focused on writing clean, efficient, and maintainable code.'
      },
      [AgentType.QA]: {
        emoji: '🔍',
        color: 'orange',
        defaultPrompt: 'You are a quality assurance engineer focused on testing and ensuring code quality.'
      }
    }
    return configs[type]
  }

  const agentConfig = getAgentTypeConfig(agent.type)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className={cn(
          'px-6 py-4 border-b border-gray-200',
          `bg-${agentConfig.color}-50`
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agentConfig.emoji}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Configure {agent.name}
                </h2>
                <p className="text-sm text-gray-600">{agent.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-sm text-orange-600 font-medium">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'presets', label: 'Presets', icon: '📋' },
              { id: 'personality', label: 'Personality', icon: '🎭' },
              { id: 'behavior', label: 'Behavior', icon: '⚙️' },
              { id: 'advanced', label: 'Advanced', icon: '🔧' },
              { id: 'workflow', label: 'Workflow', icon: '🔄' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? `border-${agentConfig.color}-500 text-${agentConfig.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'presets' && (
            <PresetsTab 
              agentType={agent.type} 
              onApplyPreset={handleApplyPreset}
              currentConfig={config}
            />
          )}
          {activeTab === 'personality' && (
            <PersonalityTab config={config} onChange={handleConfigChange} />
          )}
          {activeTab === 'behavior' && (
            <BehaviorTab config={config} onChange={handleConfigChange} />
          )}
          {activeTab === 'advanced' && (
            <AdvancedTab 
              config={config} 
              onChange={handleConfigChange} 
              agentType={agent.type}
              defaultPrompt={agentConfig.defaultPrompt}
            />
          )}
          {activeTab === 'workflow' && (
            <WorkflowTab config={config} onChange={handleConfigChange} />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {/* Import/Export Section */}
          {showImportSection ? (
            <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Import Configuration</h4>
                <button
                  onClick={() => setShowImportSection(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste configuration JSON here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm font-mono"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Import
                </button>
                <button
                  onClick={() => setShowImportSection(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={handleExport}
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Export Config
              </button>
              <button
                onClick={() => setShowImportSection(true)}
                className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Import Config
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Reset to Defaults
            </button>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-colors',
                  hasChanges
                    ? `bg-${agentConfig.color}-600 text-white hover:bg-${agentConfig.color}-700`
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                )}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Presets Tab Component
// =============================================================================

interface PresetsTabProps {
  agentType: AgentType
  onApplyPreset: (preset: ConfigurationPreset) => void
  currentConfig: AgentConfiguration
}

const PresetsTab: React.FC<PresetsTabProps> = ({ agentType, onApplyPreset, currentConfig }) => {
  const availablePresets = getPresetsForAgentType(agentType)
  const [selectedCategory, setSelectedCategory] = useState<ConfigurationPreset['category'] | 'all'>('all')

  const filteredPresets = selectedCategory === 'all' 
    ? availablePresets 
    : availablePresets.filter(preset => preset.category === selectedCategory)

  const categories = [
    { value: 'all', label: 'All Presets', count: availablePresets.length },
    { value: 'complete', label: 'Complete Setups', count: availablePresets.filter(p => p.category === 'complete').length },
    { value: 'communication', label: 'Communication', count: availablePresets.filter(p => p.category === 'communication').length },
    { value: 'workflow', label: 'Workflow', count: availablePresets.filter(p => p.category === 'workflow').length },
    { value: 'personality', label: 'Personality', count: availablePresets.filter(p => p.category === 'personality').length }
  ].filter(cat => cat.count > 0)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Presets</h3>
        <p className="text-sm text-gray-600 mb-4">
          Quick-start configurations for common use cases. Apply a preset to automatically configure multiple settings.
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value as any)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === category.value
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              )}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPresets.map((preset) => (
            <div
              key={preset.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{preset.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                </div>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {preset.category}
                </span>
              </div>

              {/* Preview Key Settings */}
              <div className="mb-4 space-y-1">
                {preset.configuration.communicationStyle && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Style:</span>
                    <span className="font-medium">{preset.configuration.communicationStyle}</span>
                  </div>
                )}
                {preset.configuration.autonomyLevel && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Autonomy:</span>
                    <span className="font-medium">{preset.configuration.autonomyLevel}</span>
                  </div>
                )}
                {preset.configuration.creativity !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Creativity:</span>
                    <span className="font-medium">{preset.configuration.creativity}%</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => onApplyPreset(preset)}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Apply Preset
              </button>
            </div>
          ))}
        </div>

        {filteredPresets.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📋</div>
            <h4 className="text-lg font-medium text-gray-900 mb-1">No Presets Available</h4>
            <p className="text-gray-600 text-sm">
              {selectedCategory === 'all' 
                ? `No presets are available for ${agentType} agents.`
                : `No ${selectedCategory} presets available for this agent type.`
              }
            </p>
          </div>
        )}

        {/* Current Configuration Summary */}
        <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Current Configuration</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Communication:</span>
              <span className="ml-2 font-medium">{currentConfig.communicationStyle}</span>
            </div>
            <div>
              <span className="text-gray-500">Verbosity:</span>
              <span className="ml-2 font-medium">{currentConfig.verbosity}</span>
            </div>
            <div>
              <span className="text-gray-500">Autonomy:</span>
              <span className="ml-2 font-medium">{currentConfig.autonomyLevel}</span>
            </div>
            <div>
              <span className="text-gray-500">Questions:</span>
              <span className="ml-2 font-medium">{currentConfig.questionFrequency}</span>
            </div>
            <div>
              <span className="text-gray-500">Proactiveness:</span>
              <span className="ml-2 font-medium">{currentConfig.proactiveness}%</span>
            </div>
            <div>
              <span className="text-gray-500">Creativity:</span>
              <span className="ml-2 font-medium">{currentConfig.creativity}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Personality Tab Component
// =============================================================================

interface TabProps {
  config: AgentConfiguration
  onChange: (updates: Partial<AgentConfiguration>) => void
}

const PersonalityTab: React.FC<TabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Communication Style</h3>
        
        {/* Communication Style */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Communication Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'formal', label: 'Formal', desc: 'Professional, structured communication' },
                { value: 'casual', label: 'Casual', desc: 'Relaxed, friendly tone' },
                { value: 'friendly', label: 'Friendly', desc: 'Warm, personable approach' },
                { value: 'professional', label: 'Professional', desc: 'Balanced business communication' }
              ].map((style) => (
                <label key={style.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="communicationStyle"
                    value={style.value}
                    checked={config.communicationStyle === style.value}
                    onChange={(e) => onChange({ communicationStyle: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-600">{style.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Verbosity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Response Length
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'concise', label: 'Concise', desc: 'Brief, to-the-point responses' },
                { value: 'balanced', label: 'Balanced', desc: 'Moderate detail level' },
                { value: 'verbose', label: 'Verbose', desc: 'Detailed, comprehensive responses' }
              ].map((style) => (
                <label key={style.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="verbosity"
                    value={style.value}
                    checked={config.verbosity === style.value}
                    onChange={(e) => onChange({ verbosity: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-600">{style.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Autonomy Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Autonomy Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'low', label: 'Low Autonomy', desc: 'Asks for guidance frequently' },
                { value: 'medium', label: 'Medium Autonomy', desc: 'Balanced decision making' },
                { value: 'high', label: 'High Autonomy', desc: 'Makes decisions independently' }
              ].map((level) => (
                <label key={level.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="autonomyLevel"
                    value={level.value}
                    checked={config.autonomyLevel === level.value}
                    onChange={(e) => onChange({ autonomyLevel: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{level.label}</div>
                    <div className="text-sm text-gray-600">{level.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Question Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Frequency
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'minimal', label: 'Minimal', desc: 'Rarely asks questions' },
                { value: 'normal', label: 'Normal', desc: 'Asks when needed' },
                { value: 'frequent', label: 'Frequent', desc: 'Asks clarifying questions often' }
              ].map((freq) => (
                <label key={freq.value} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="questionFrequency"
                    value={freq.value}
                    checked={config.questionFrequency === freq.value}
                    onChange={(e) => onChange({ questionFrequency: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{freq.label}</div>
                    <div className="text-sm text-gray-600">{freq.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Behavior Tab Component
// =============================================================================

const BehaviorTab: React.FC<TabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Behavior Preferences</h3>
        
        <div className="space-y-6">
          {/* Proactiveness Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proactiveness: {config.proactiveness}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.proactiveness}
              onChange={(e) => onChange({ proactiveness: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Reactive</span>
              <span>Proactive</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              How likely the agent is to suggest improvements or take initiative
            </p>
          </div>

          {/* Creativity Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creativity: {config.creativity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.creativity}
              onChange={(e) => onChange({ creativity: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              How creative and innovative the agent's suggestions will be
            </p>
          </div>

          {/* Risk Tolerance Slider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risk Tolerance: {config.riskTolerance}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.riskTolerance}
              onChange={(e) => onChange({ riskTolerance: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Risk Averse</span>
              <span>Risk Tolerant</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              How willing the agent is to suggest experimental or untested approaches
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Advanced Tab Component
// =============================================================================

interface AdvancedTabProps extends TabProps {
  agentType: AgentType
  defaultPrompt: string
}

const AdvancedTab: React.FC<AdvancedTabProps> = ({ config, onChange, defaultPrompt }) => {
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        
        <div className="space-y-6">
          {/* Max Response Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Response Length
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="100"
                max="5000"
                value={config.maxResponseLength || 2000}
                onChange={(e) => onChange({ maxResponseLength: parseInt(e.target.value) })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">characters</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Maximum length for agent responses
            </p>
          </div>

          {/* Temperature Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Creativity Temperature: {(config.temperatureSetting || 0.7).toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.temperatureSetting || 0.7}
              onChange={(e) => onChange({ temperatureSetting: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused (0.0)</span>
              <span>Creative (1.0)</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Controls randomness and creativity in AI responses
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Custom System Prompt
              </label>
              <button
                onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {showSystemPrompt ? 'Hide' : 'Edit'} System Prompt
              </button>
            </div>
            
            {showSystemPrompt && (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Default Prompt:</p>
                  <p className="text-sm text-gray-600">{defaultPrompt}</p>
                </div>
                
                <textarea
                  value={config.customSystemPrompt || ''}
                  onChange={(e) => onChange({ customSystemPrompt: e.target.value })}
                  placeholder="Enter custom system prompt or leave empty to use default..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onChange({ customSystemPrompt: '' })}
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => onChange({ customSystemPrompt: defaultPrompt })}
                    className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    Use Default
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Workflow Tab Component
// =============================================================================

const WorkflowTab: React.FC<TabProps> = ({ config, onChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow Preferences</h3>
        
        <div className="space-y-6">
          {/* Working Hours */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="workingHours"
                checked={config.workingHours?.enabled || false}
                onChange={(e) => onChange({
                  workingHours: {
                    ...config.workingHours,
                    enabled: e.target.checked,
                    startTime: config.workingHours?.startTime || '09:00',
                    endTime: config.workingHours?.endTime || '17:00',
                    timezone: config.workingHours?.timezone || 'UTC'
                  }
                })}
                className="rounded"
              />
              <label htmlFor="workingHours" className="text-sm font-medium text-gray-700">
                Enable Working Hours
              </label>
            </div>
            
            {config.workingHours?.enabled && (
              <div className="ml-6 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={config.workingHours?.startTime || '09:00'}
                      onChange={(e) => onChange({
                        workingHours: { ...config.workingHours!, startTime: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={config.workingHours?.endTime || '17:00'}
                      onChange={(e) => onChange({
                        workingHours: { ...config.workingHours!, endTime: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Timezone</label>
                  <select
                    value={config.workingHours?.timezone || 'UTC'}
                    onChange={(e) => onChange({
                      workingHours: { ...config.workingHours!, timezone: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Paris">Paris</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Notification Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Notification Preferences</h4>
            <div className="space-y-3">
              {[
                { key: 'statusChanges', label: 'Status Changes', desc: 'Notify when agent status changes' },
                { key: 'taskAssignments', label: 'Task Assignments', desc: 'Notify when new tasks are assigned' },
                { key: 'completions', label: 'Task Completions', desc: 'Notify when tasks are completed' },
                { key: 'errors', label: 'Errors', desc: 'Notify when errors occur' }
              ].map((notification) => (
                <label key={notification.key} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={config.notifications[notification.key as keyof typeof config.notifications]}
                    onChange={(e) => onChange({
                      notifications: {
                        ...config.notifications,
                        [notification.key]: e.target.checked
                      }
                    })}
                    className="mt-1 rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{notification.label}</div>
                    <div className="text-sm text-gray-600">{notification.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}