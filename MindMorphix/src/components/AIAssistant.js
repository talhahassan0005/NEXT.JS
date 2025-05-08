'use client';
import { useState } from 'react';

export default function AIAssistant() {
  const [question, setQuestion] = useState('');
  const [chat, setChat] = useState([]); // stores conversation history
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const askAI = async () => {
    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    setError('');
    const userMessage = { sender: 'user', text: question };
    setChat((prev) => [...prev, userMessage]); // add user message to chat
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question }),
      });

      if (!res.ok) throw new Error('Failed to fetch AI response');
      const data = await res.json();

      const aiMessage = { sender: 'ai', text: data.text || 'No response generated' };
      setChat((prev) => [...prev, aiMessage]); // add AI response to chat
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-dark text-light">
      <h2 className="mb-3 text-primary">💬 Ask AI About Tumors or Treatments</h2>

      {/* Chat History */}
      <div className="mb-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {chat.map((msg, index) => (
          <div
            key={index}
            className={`p-2 mb-2 rounded ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-secondary text-white'}`}
          >
            <strong>{msg.sender === 'user' ? 'You' : 'AI'}:</strong>
            <p className="mb-0">{msg.text}</p>
          </div>
        ))}
        {loading && <p className="text-info">AI is thinking...</p>}
      </div>

      {/* Input Box */}
      <textarea
        className="form-control bg-dark text-light mb-2"
        rows="3"
        placeholder="Enter your question here..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      ></textarea>
      <button className="btn btn-primary" onClick={askAI} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask AI'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 bg-danger text-white rounded">
          <strong>Error:</strong>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
