import React from "react";

const mockChats = [
  { id: 1, name: "Lucas Murphy", lastMsg: "I have some questions...", time: "3:45 PM" },
  { id: 2, name: "Alexandra Green", lastMsg: "Our company is interested...", time: "09:15 AM" },
  { id: 3, name: "Osman Farooq", lastMsg: "Got it, I’ll review the details...", time: "Yesterday" },
];

const MessageList = ({ onSelectChat }) => {
  return (
    <div className="w-1/3 bg-white rounded-xl shadow p-3 overflow-y-auto">
      <input
        type="text"
        placeholder="Search name, chat, etc..."
        className="w-full mb-3 p-2 border rounded-lg"
      />
      {mockChats.map((chat) => (
        <div
          key={chat.id}
          onClick={() => onSelectChat(chat)}
          className="cursor-pointer p-3 hover:bg-gray-100 rounded-lg"
        >
          <div className="font-semibold">{chat.name}</div>
          <div className="text-sm text-gray-500">{chat.lastMsg}</div>
          <div className="text-xs text-gray-400">{chat.time}</div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
