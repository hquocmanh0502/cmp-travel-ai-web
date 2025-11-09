import React, { useState, useEffect, useRef } from 'react';
import { MdNotifications, MdEmail, MdWarning, MdClose } from 'react-icons/md';

const Notifications = ({ setActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    pendingContacts: 0,
    pendingViolations: 0,
  });
  const dropdownRef = useRef(null);

  // Load notification counts
  useEffect(() => {
    fetchNotificationCounts();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationCounts();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotificationCounts = async () => {
    try {
      // Fetch pending contacts from stats endpoint (like ContactManagement does)
      const contactsRes = await fetch('http://localhost:3000/api/contacts/admin/stats');
      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        const pending = contactsData.data?.pendingContacts || 0;
        
        setNotifications(prev => ({ ...prev, pendingContacts: pending }));
      }

      // Fetch pending violations (like BanManagement does)
      const violationsRes = await fetch('http://localhost:3000/api/admin-ban/violations?status=pending');
      if (violationsRes.ok) {
        const violationsData = await violationsRes.json();
        const pending = violationsData.data?.length || 0;
        
        setNotifications(prev => ({ ...prev, pendingViolations: pending }));
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const totalNotifications = notifications.pendingContacts + notifications.pendingViolations;

  const handleNavigate = (page) => {
    setActive(page);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow relative"
        aria-label="notifications"
      >
        🔔
        {totalNotifications > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <MdClose className="w-5 h-5" />
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {totalNotifications === 0 ? (
              <div className="p-8 text-center">
                <MdNotifications className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Pending Contacts Notification */}
                {notifications.pendingContacts > 0 && (
                  <button
                    onClick={() => handleNavigate('contact-management')}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <MdEmail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">
                        {notifications.pendingContacts} Pending Contact{notifications.pendingContacts > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        New messages waiting for review
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">→</span>
                  </button>
                )}

                {/* Pending Violations Notification */}
                {notifications.pendingViolations > 0 && (
                  <button
                    onClick={() => handleNavigate('ban-management')}
                    className="w-full p-4 hover:bg-gray-50 transition-colors text-left flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <MdWarning className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">
                        {notifications.pendingViolations} Pending Violation{notifications.pendingViolations > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        User violations need attention
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">→</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {totalNotifications > 0 && (
            <div className="p-3 border-t border-gray-200">
              <button
                onClick={() => {
                  fetchNotificationCounts();
                }}
                className="w-full text-center text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                Refresh Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
