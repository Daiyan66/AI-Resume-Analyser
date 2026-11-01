import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { recruiterService } from '../services/recruiterService';

export const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your Recruiter AI Copilot. Ask me to summarize candidate pools, draft customized rejection/offer letters, or craft specialized interview questions!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const botReply = await recruiterService.askChatbot(userMessage);
      setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'I encountered an error connecting to the AI screening service. Please try again in a moment.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1050 }}>
      {isOpen ? (
        <Card className="shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '380px', height: '520px' }}>
          <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center py-3 px-3">
            <div className="d-flex align-items-center gap-2">
              <Bot size={20} />
              <span className="fw-bold">Recruiter AI Copilot</span>
            </div>
            <Button variant="link" className="text-white p-0" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </Button>
          </Card.Header>

          <Card.Body className="p-3 overflow-y-auto d-flex flex-column gap-2" style={{ maxHeight: '390px' }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`d-flex gap-2 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="avatar-circle-sm bg-primary-subtle text-primary flex-shrink-0">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`p-2 rounded-3 small ${
                    msg.sender === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-light text-dark border'
                  }`}
                  style={{ maxWidth: '80%', whiteSpace: 'pre-wrap' }}
                >
                  {msg.text}
                </div>
                {msg.sender === 'user' && (
                  <div className="avatar-circle-sm bg-secondary-subtle text-secondary flex-shrink-0">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="d-flex align-items-center gap-2 text-muted small py-1">
                <Spinner animation="border" size="sm" />
                <span>AI Copilot is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </Card.Body>

          <Card.Footer className="bg-white border-top p-2">
            <Form onSubmit={handleSend} className="d-flex gap-2">
              <Form.Control
                type="text"
                size="sm"
                placeholder="Ask advice, draft email, etc..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoFocus
              />
              <Button variant="primary" size="sm" type="submit" disabled={loading || !input.trim()}>
                <Send size={16} />
              </Button>
            </Form>
          </Card.Footer>
        </Card>
      ) : (
        <Button
          variant="primary"
          className="rounded-circle shadow-lg p-3 d-flex align-items-center justify-content-center"
          style={{ width: '56px', height: '56px' }}
          onClick={() => setIsOpen(true)}
          title="Open AI Recruiter Copilot"
        >
          <MessageSquare size={24} />
        </Button>
      )}
    </div>
  );
};
