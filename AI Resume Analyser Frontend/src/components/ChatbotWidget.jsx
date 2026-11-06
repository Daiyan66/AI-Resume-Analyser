import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Button, Spinner, Badge } from 'react-bootstrap';
import { 
  X, 
  Send, 
  User, 
  RotateCcw, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  Zap
} from 'lucide-react';
import { chatbotService } from '../services/chatbotService';

// Unique Futuristic Gena Emblem Icon
const GenaIcon = ({ size = 28, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={{ filter: 'drop-shadow(0px 2px 8px rgba(99, 102, 241, 0.45))' }}
  >
    <defs>
      <linearGradient id="genaOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="50%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#c084fc" />
      </linearGradient>
      <linearGradient id="genaCoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f46e5" />
        <stop offset="50%" stopColor="#7c3aed" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    {/* Outer orbital dash ring */}
    <circle cx="24" cy="24" r="21" stroke="url(#genaOuterGrad)" strokeWidth="2.2" strokeDasharray="5 3" opacity="0.9" />
    {/* Central Glowing Core */}
    <circle cx="24" cy="24" r="16.5" fill="url(#genaCoreGrad)" />
    {/* Luminous G Glyph */}
    <path
      d="M30.5 18C28.8 15.5 25.8 14 22.8 14C17.5 14 13.2 18.5 13.2 24C13.2 29.5 17.5 34 22.8 34C27.6 34 31.7 30.5 32.5 25.8H22.8V22H36.2C36.4 22.7 36.5 23.3 36.5 24C36.5 31.5 30.4 37.5 22.8 37.5C15.2 37.5 9 31.5 9 24C9 16.5 15.2 10.5 22.8 10.5C27.2 10.5 31.1 12.5 33.6 15.8L30.5 18Z"
      fill="#ffffff"
    />
    {/* Center Sparkle Accent */}
    <polygon
      points="27,24 28.8,21.5 30.5,24 33,24.8 30.5,25.6 28.8,28.2 27,25.6 24.5,24.8"
      fill="#38bdf8"
    />
  </svg>
);

const FREQUENT_QUESTIONS = [
  "🎯 How does the AI resume scoring work?",
  "⏳ What is the 3-month re-apply cooldown?",
  "💼 How do I optimize my resume for ATS?",
  "🏢 How do recruiters get corporate access?"
];

export const ChatbotWidget = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm **Gena**, your AI Project & Career Assistant for the Next-Gen ATS Platform.\n\nHow can I help you with your career or recruitment goals today?",
      suggestedQuestions: FREQUENT_QUESTIONS
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const handleSendQuery = async (queryText) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    setInput('');
    const newHistory = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: textToSend }
    ];

    setMessages((prev) => [
      ...prev,
      { role: 'user', content: textToSend }
    ]);
    setLoading(true);

    try {
      const result = await chatbotService.askChatbot(newHistory);
      const replyText = result.response || "How can I help you with your career or recruitment goals today?";
      const suggestions = result.suggestedQuestions && result.suggestedQuestions.length > 0
        ? result.suggestedQuestions
        : FREQUENT_QUESTIONS;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: replyText,
          suggestedQuestions: suggestions
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I am Gena, strictly dedicated to assisting with this Next-Gen AI ATS platform, career openings, resume evaluations, and recruitment workflows.\n\nHow can I help you with your career or recruitment goals today?",
          suggestedQuestions: FREQUENT_QUESTIONS
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Chat history cleared. How can I help you with your career or recruitment goals today?",
        suggestedQuestions: FREQUENT_QUESTIONS
      }
    ]);
  };

  // Safe markdown formatter for clean text, bold highlights, headers, and bullet lists
  const renderFormattedContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');

    return lines.map((line, i) => {
      let trimmed = line.trim();

      if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
        const title = trimmed.replace(/^#+\s*/, '');
        return (
          <h6 key={i} className="fw-bold text-dark mt-2 mb-1" style={{ fontSize: '0.9rem' }}>
            {renderInlineMarkdown(title)}
          </h6>
        );
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const itemText = trimmed.substring(2);
        return (
          <div key={i} className="d-flex align-items-start gap-1.5 ms-2 mb-1">
            <span className="text-primary fw-bold" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>•</span>
            <span style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>{renderInlineMarkdown(itemText)}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div key={i} className="ms-2 mb-1" style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
            {renderInlineMarkdown(trimmed)}
          </div>
        );
      }

      if (!trimmed) {
        return <div key={i} style={{ height: '6px' }} />;
      }

      return (
        <p key={i} className="mb-1" style={{ fontSize: '0.86rem', lineHeight: '1.55' }}>
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text) => {
    if (!text) return '';
    // Tokenize markdown links [label](url) and bold **bold**
    const tokens = text.split(/(\[[^\]]+\]\([^\)]+\)|\*\*[^*]+\*\*)/g);

    return tokens.map((part, index) => {
      if (!part) return null;
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="fw-bold text-dark">{part.slice(2, -2)}</strong>;
      }
      const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const isInternal = href.startsWith('/');
        return (
          <a
            key={index}
            href={href}
            onClick={(e) => {
              if (isInternal) {
                e.preventDefault();
                navigate(href);
              }
            }}
            className="fw-semibold text-decoration-underline"
            style={{ 
              color: '#4f46e5',
              cursor: 'pointer',
              margin: '0 2px'
            }}
          >
            {label}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <>
      <style>{`
        .gena-chat-window {
          position: fixed;
          top: 75px;
          bottom: 20px;
          right: 20px;
          width: 450px;
          max-width: calc(100vw - 32px);
          height: calc(100vh - 95px);
          z-index: 1060;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28), 0 0 0 1px rgba(99, 102, 241, 0.18);
          animation: genaSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes genaSlideIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .gena-launcher-btn {
          position: fixed !important;
          bottom: 24px !important;
          right: 24px !important;
          left: auto !important;
          top: auto !important;
          z-index: 9999 !important;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #06b6d4 100%);
          border: 2px solid rgba(255, 255, 255, 0.45);
          box-shadow: 0 12px 32px rgba(79, 70, 229, 0.5), 0 0 24px rgba(6, 182, 212, 0.35);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .gena-launcher-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 16px 40px rgba(79, 70, 229, 0.55), 0 0 30px rgba(6, 182, 212, 0.45);
        }
        .gena-chip-btn {
          background-color: #ffffff;
          border: 1px solid #e0e7ff;
          color: #312e81;
          font-size: 0.78rem;
          font-weight: 500;
          padding: 5px 11px;
          border-radius: 9999px;
          transition: all 0.15s ease-in-out;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .gena-chip-btn:hover {
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          border-color: #6366f1;
          color: #1e1b4b;
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(99, 102, 241, 0.15);
        }
        .gena-chip-btn:active {
          transform: translateY(0);
        }
      `}</style>

      {isOpen ? (
        <Card className="gena-chat-window border-0 rounded-4 overflow-hidden d-flex flex-column bg-white">
          {/* Header */}
          <div 
            className="text-white p-3.5 d-flex justify-content-between align-items-center flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #312e81 100%)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="d-flex align-items-center gap-2.5">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center position-relative shadow-sm"
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)' 
                }}
              >
                <GenaIcon size={26} />
                <span 
                  className="position-absolute rounded-circle bg-success"
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    bottom: '1px', 
                    right: '1px', 
                    border: '2px solid #0f172a' 
                  }}
                />
              </div>

              <div>
                <h6 className="fw-bold mb-0 text-white" style={{ fontSize: '1rem', letterSpacing: '-0.2px' }}>
                  Gena
                </h6>
                <div className="d-flex align-items-center gap-1.5" style={{ fontSize: '0.74rem', color: '#4ade80', fontWeight: 500 }}>
                  <span 
                    className="rounded-circle bg-success" 
                    style={{ 
                      width: '7px', 
                      height: '7px', 
                      display: 'inline-block',
                      boxShadow: '0 0 6px #22c55e' 
                    }} 
                  />
                  Online
                </div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-1">
              <Button 
                variant="link" 
                className="text-white p-1.5 opacity-75 hover-opacity-100" 
                onClick={handleClearChat}
                title="Clear conversation"
              >
                <RotateCcw size={16} />
              </Button>
              <Button 
                variant="link" 
                className="text-white p-1.5 opacity-75 hover-opacity-100" 
                onClick={() => setIsOpen(false)}
                title="Minimize Gena"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {/* Messages Body (Takes full height of green box) */}
          <Card.Body 
            className="p-3.5 overflow-y-auto d-flex flex-column bg-light-subtle" 
            style={{ flexGrow: 1 }}
          >
            {messages.map((msg, idx) => (
              <div key={idx} className="mb-3">
                <div className={`d-flex gap-2.5 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                  {msg.role === 'assistant' && (
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
                        border: '1px solid rgba(99, 102, 241, 0.3)' 
                      }}
                    >
                      <GenaIcon size={20} />
                    </div>
                  )}

                  <div
                    className={`p-3 rounded-4 shadow-sm ${
                      msg.role === 'user'
                        ? 'text-white'
                        : 'bg-white text-dark border border-slate-200'
                    }`}
                    style={{ 
                      maxWidth: '85%', 
                      wordBreak: 'break-word',
                      background: msg.role === 'user' 
                        ? 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)' 
                        : '#ffffff'
                    }}
                  >
                    {msg.role === 'user' ? (
                      <span style={{ fontSize: '0.88rem', lineHeight: '1.45', display: 'block' }}>
                        {msg.content}
                      </span>
                    ) : (
                      <div>{renderFormattedContent(msg.content)}</div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div 
                      className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm"
                      style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}
                    >
                      <User size={16} />
                    </div>
                  )}
                </div>

                {/* Response-Relevant Option Question Buttons (Directly below Gena's response) */}
                {msg.role === 'assistant' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="ms-5 mt-2 d-flex flex-wrap gap-1.5 align-items-center">
                    {msg.suggestedQuestions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        className="gena-chip-btn text-start d-inline-flex align-items-center gap-1.5"
                        disabled={loading}
                        onClick={() => handleSendQuery(q)}
                      >
                        <span>{q}</span>
                        <ChevronRight size={13} className="text-primary opacity-75" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="d-flex align-items-center gap-2.5 py-2 px-3 bg-white border border-slate-200 rounded-3 shadow-sm align-self-start mb-2 ms-5">
                <Spinner animation="border" size="sm" variant="primary" />
                <span style={{ fontSize: '0.82rem', color: '#475569' }}>Gena is formulating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </Card.Body>

          {/* Footer Input Area */}
          <div className="bg-white border-top p-3 flex-shrink-0">
            <Form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery();
              }} 
              className="d-flex gap-2"
            >
              <Form.Control
                ref={inputRef}
                type="text"
                placeholder="Ask Gena about jobs, scoring, or platform..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                className="rounded-3 shadow-none border-secondary-subtle px-3 py-2"
                style={{ fontSize: '0.88rem' }}
              />
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || !input.trim()}
                className="d-flex align-items-center justify-content-center px-3 rounded-3 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #6366f1)', border: 'none' }}
              >
                <Send size={16} />
              </Button>
            </Form>

            <div className="text-center mt-2" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              <ShieldCheck size={12} className="me-1 text-primary" />
              Strictly restricted to project & job-related queries.
            </div>
          </div>
        </Card>
      ) : (
        /* Unique Floating Launcher Button in Bottom Right Corner of Screen */
        <button
          type="button"
          className="gena-launcher-btn d-flex align-items-center justify-content-center border-0 p-0 shadow-lg"
          onClick={() => setIsOpen(true)}
          title="Open Gena • AI Project & Career Assistant"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999
          }}
        >
          <GenaIcon size={34} />
          {/* Active online glowing beacon */}
          <span 
            className="position-absolute rounded-circle bg-success"
            style={{ 
              width: '13px', 
              height: '13px', 
              top: '3px', 
              right: '3px', 
              border: '2.5px solid #ffffff',
              boxShadow: '0 0 8px rgba(34, 197, 94, 0.8)'
            }}
          />
        </button>
      )}
    </>
  );
};
