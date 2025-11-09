import React, { useState, useEffect } from 'react';
import {
  MdSave,
  MdRefresh,
  MdPalette,
} from 'react-icons/md';
import toast from 'react-hot-toast';

const Settings = () => {
  const [loading, setLoading] = useState(false);
  
  // Predefined color themes
  const colorThemes = [
    { name: 'Orange (Default)', color: '#f97316', textColor: 'text-orange-600', bgColor: 'bg-orange-500' },
    { name: 'Blue', color: '#3b82f6', textColor: 'text-blue-600', bgColor: 'bg-blue-500' },
    { name: 'Green', color: '#10b981', textColor: 'text-green-600', bgColor: 'bg-green-500' },
    { name: 'Purple', color: '#8b5cf6', textColor: 'text-purple-600', bgColor: 'bg-purple-500' },
    { name: 'Pink', color: '#ec4899', textColor: 'text-pink-600', bgColor: 'bg-pink-500' },
    { name: 'Red', color: '#ef4444', textColor: 'text-red-600', bgColor: 'bg-red-500' },
    { name: 'Teal', color: '#14b8a6', textColor: 'text-teal-600', bgColor: 'bg-teal-500' },
    { name: 'Indigo', color: '#6366f1', textColor: 'text-indigo-600', bgColor: 'bg-indigo-500' },
  ];

  const [accentColor, setAccentColor] = useState('#f97316');

  // Load settings from localStorage
  useEffect(() => {
    const savedColor = localStorage.getItem('adminAccentColor');
    if (savedColor) {
      setAccentColor(savedColor);
      applyColorToPage(savedColor);
    }
  }, []);

  const applyColorToPage = (color) => {
    // Apply color to CSS variables
    document.documentElement.style.setProperty('--accent-color', color);
    
    // Update all orange classes to use the new color
    const style = document.createElement('style');
    style.id = 'dynamic-accent-color';
    
    // Remove old style if exists
    const oldStyle = document.getElementById('dynamic-accent-color');
    if (oldStyle) {
      oldStyle.remove();
    }
    
    style.innerHTML = `
      .bg-orange-500 { background-color: ${color} !important; }
      .bg-orange-600 { background-color: ${color} !important; }
      .hover\\:bg-orange-600:hover { background-color: ${adjustBrightness(color, -20)} !important; }
      .text-orange-500 { color: ${color} !important; }
      .text-orange-600 { color: ${color} !important; }
      .border-orange-500 { border-color: ${color} !important; }
      .border-orange-600 { border-color: ${color} !important; }
      .ring-orange-500 { --tw-ring-color: ${color} !important; }
      .focus\\:ring-orange-500:focus { --tw-ring-color: ${color} !important; }
      .peer-checked\\:bg-orange-500:checked { background-color: ${color} !important; }
    `;
    
    document.head.appendChild(style);
  };

  const adjustBrightness = (color, amount) => {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  };

  const saveSettings = () => {
    setLoading(true);
    
    try {
      localStorage.setItem('adminAccentColor', accentColor);
      applyColorToPage(accentColor);
      
      setTimeout(() => {
        setLoading(false);
        toast.success('Color theme saved successfully!');
      }, 500);
    } catch (error) {
      setLoading(false);
      toast.error('Failed to save settings');
      console.error('Save error:', error);
    }
  };

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset to default orange color?')) {
      const defaultColor = '#f97316';
      setAccentColor(defaultColor);
      localStorage.setItem('adminAccentColor', defaultColor);
      applyColorToPage(defaultColor);
      toast.success('Reset to default color!');
    }
  };

  const selectTheme = (color) => {
    setAccentColor(color);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Theme Settings</h1>
          <p className="text-gray-600">Customize your dashboard accent color</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetSettings}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
          >
            <MdRefresh className="w-5 h-5" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={loading}
            className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <MdSave className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Theme'}
          </button>
        </div>
      </div>

      {/* Color Themes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <MdPalette className="w-6 h-6 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Choose Color Theme</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {colorThemes.map((theme) => (
            <button
              key={theme.color}
              onClick={() => selectTheme(theme.color)}
              className={`p-4 rounded-lg border-2 transition-all ${
                accentColor === theme.color
                  ? 'border-gray-800 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div
                className="w-full h-16 rounded-lg mb-3"
                style={{ backgroundColor: theme.color }}
              ></div>
              <p className="text-sm font-medium text-gray-800">{theme.name}</p>
            </button>
          ))}
        </div>

        {/* Custom Color Picker */}
        <div className="border-t pt-6">
          <h4 className="text-sm font-semibold text-gray-800 mb-4">Custom Color</h4>
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pick Your Own Color
              </label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => selectTheme(e.target.value)}
                  className="w-20 h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => selectTheme(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="#f97316"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview</h3>
        <div className="space-y-4">
          {/* Button Preview */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Buttons:</p>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                Primary Button
              </button>
              <button className="px-4 py-2 border-2 border-orange-500 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors">
                Outline Button
              </button>
            </div>
          </div>

          {/* Toggle Preview */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Toggle Switch:</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Enabled</span>
            </label>
          </div>

          {/* Badge Preview */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Badges:</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-orange-500 text-white text-sm rounded-full">Active</span>
              <span className="px-3 py-1 bg-orange-100 text-orange-600 text-sm rounded-full">Pending</span>
            </div>
          </div>

          {/* Text Preview */}
          <div>
            <p className="text-sm text-gray-600 mb-2">Text Colors:</p>
            <p className="text-orange-600 font-medium">This is accent colored text</p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <MdPalette className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Theme Note</p>
            <p>The color theme will be applied immediately after saving. Your preference is saved in your browser.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
