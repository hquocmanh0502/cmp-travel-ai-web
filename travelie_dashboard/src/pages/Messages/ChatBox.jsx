import React, { useState } from "react";

const ChatBox = ({ chat }) => {
  const [messages, setMessages] = useState([
    { from: "client", text: "Hello, can you help me with booking?" },
    { from: "admin", text: "Sure! Please provide more details." },
  ]);
  const [input, setInput] = useState("");

  if (!chat) {
    return <div className="flex-1 bg-white rounded-xl shadow p-4 flex items-center justify-center text-gray-400">
      Select a conversation
    </div>;
  }

  const sendMessage = () => {
    if (!input) return;
    setMessages([...messages, { from: "admin", text: input }]);
    setInput("");
  };

  return (
    <div className="flex-1 bg-white rounded-xl shadow flex flex-col">
      <div className="p-4 border-b font-semibold">{chat.name}</div>

      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 p-2 rounded-lg max-w-sm ${
              msg.from === "admin" ? "bg-blue-500 text-white ml-auto" : "bg-gray-200"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg p-2"
        />
        <button onClick={sendMessage} className="bg-blue-500 text-white px-4 rounded-lg">
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
