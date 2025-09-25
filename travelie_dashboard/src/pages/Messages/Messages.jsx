import React, { useState } from "react";
import { FiSend } from "react-icons/fi";

const mockChats = [
  {
    id: 1,
    name: "Lucas Murphy",
    lastMsg: "I have some questions about the Parisian...",
    time: "3:45 PM",
    avatar: "https://i.pravatar.cc/40?img=1",
  },
  {
    id: 2,
    name: "Alexandra Green",
    lastMsg: "Our company is interested in organizing...",
    time: "09:15 AM",
    avatar: "https://i.pravatar.cc/40?img=2",
  },
  {
    id: 3,
    name: "Osman Farooq",
    lastMsg: "Got it, I’ll review the details...",
    time: "Yesterday",
    avatar: "https://i.pravatar.cc/40?img=3",
  },
];

const Messages = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([
    { from: "client", text: "Hello, I had an amazing time on the Venice Dreams package!" },
    { from: "admin", text: "We’re glad to hear that! Do you want to book a similar trip?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { from: "admin", text: input }]);
    setInput("");
  };

  return (
    <div className="flex gap-4">
      {/* Danh sách hội thoại */}
      <div className="w-1/3 bg-white rounded-xl shadow p-4 flex flex-col">
        <input
          type="text"
          placeholder="Search name, chat, etc..."
          className="w-full mb-4 p-2 border rounded-lg text-sm"
        />
        <div className="flex-1 overflow-y-auto">
          {mockChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-100 ${
                selectedChat?.id === chat.id ? "bg-gray-100" : ""
              }`}
            >
              <img
                src={chat.avatar}
                alt={chat.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="font-semibold text-sm">{chat.name}</div>
                <div className="text-xs text-gray-500 truncate">{chat.lastMsg}</div>
              </div>
              <div className="text-xs text-gray-400">{chat.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Khung chat */}
      <div className="flex-1 bg-white rounded-xl shadow flex flex-col">
        {selectedChat ? (
          <>
            {/* Header chat */}
            <div className="flex items-center gap-3 p-4 border-b">
              <img
                src={selectedChat.avatar}
                alt={selectedChat.name}
                className="w-10 h-10 rounded-full"
              />
              <div>
                <div className="font-semibold">{selectedChat.name}</div>
                <div className="text-xs text-gray-400">last seen recently</div>
              </div>
            </div>

            {/* Nội dung chat */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-3 p-3 rounded-xl max-w-xs ${
                    msg.from === "admin"
                      ? "bg-blue-500 text-white ml-auto"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Nhập tin nhắn */}
            <div className="p-3 border-t flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border rounded-lg p-2 text-sm"
              />
              <button
                onClick={handleSend}
                className="bg-blue-500 text-white px-4 rounded-lg flex items-center gap-1"
              >
                <FiSend /> Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
