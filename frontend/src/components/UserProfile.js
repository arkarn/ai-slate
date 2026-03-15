import React, { useState, useRef, useEffect } from 'react';
import { FaChevronDown, FaSignOutAlt, FaEnvelope } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';

const UserProfile = () => {
  const { session, signOut, getUserDisplayName, getUserInitials } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    signOut();
    setShowDropdown(false);
  };

  if (!session) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-2 border border-white/20 hover:bg-white/20 transition-all duration-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          <span className="text-white font-bold text-sm">{getUserInitials()}</span>
        </div>
        <div className="hidden sm:block text-white">
          <p className="text-sm font-medium">{getUserDisplayName()}</p>
        </div>
        <FaChevronDown className={`h-4 w-4 text-white/80 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Profile Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 py-2 z-50">
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-200/50">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <span className="text-white font-bold">{getUserInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {getUserDisplayName()}
                </p>
                <div className="flex items-center mt-1">
                  <FaEnvelope className="h-3 w-3 text-gray-500 mr-1" />
                  <p className="text-xs text-gray-600 truncate">
                    {session.user.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Account Status</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                Active
              </span>
            </div>
          </div>

          {/* Logout Button */}
          <div className="px-2 py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
            >
              <FaSignOutAlt className="h-4 w-4 mr-3" />
              Sign Out
            </button>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200/50 mt-1">
            <p className="text-xs text-gray-500 text-center">
              AISlate v1.0 ✨
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
