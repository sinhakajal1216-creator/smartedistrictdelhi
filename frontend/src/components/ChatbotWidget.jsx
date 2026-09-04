import { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bot,
  Copy,
  Mic,
  MicOff,
  SendHorizontal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X
} from 'lucide-react';
import { sendChatMessage, transcribeSpeech } from '../services/chatbot';
import ArVrGuidanceModal from './ArVrGuidanceModal';
import '../styles/chatbotWidget.css';

function toChatbotProfile(prof = {}) {
  if (!prof || typeof prof !== 'object') return {};

  const profile = {};

  if (prof.age !== '' && prof.age !== undefined && prof.age !== null) {
    profile.age = Number(prof.age);
  }
  if (prof.delhiResident !== undefined) profile.delhiResident = !!prof.delhiResident;
  else if (prof.residency !== undefined) profile.delhiResident = !!prof.residency;
  if (prof.residenceYears !== '' && prof.residenceYears !== undefined && prof.residenceYears !== null) {
    profile.residenceYears = Number(prof.residenceYears);
  }
  if (prof.aadhaar !== undefined) profile.aadhaar = !!prof.aadhaar;
  else if (prof.hasAadhaar !== undefined) profile.aadhaar = !!prof.hasAadhaar;
  if (prof.receivesOtherPension !== undefined) profile.receivesOtherPension = !!prof.receivesOtherPension;
  if (prof.income !== '' && prof.income !== undefined && prof.income !== null) {
    profile.income = Number(prof.income);
  }
  if (prof.gender) profile.gender = prof.gender;
  if (prof.category) profile.category = String(prof.category).toLowerCase();
  if (prof.occupation) profile.occupation = prof.occupation;
  if (prof.disability === true || prof.disability === 'yes') profile.disability = 'yes';
  else if (prof.disability === false || prof.disability === 'no') profile.disability = 'no';
  if (prof.disabilityPercentage !== '' && prof.disabilityPercentage !== undefined && prof.disabilityPercentage !== null) {
    profile.disabilityPercentage = Number(prof.disabilityPercentage);
  }
  if (prof.maritalStatus) profile.maritalStatus = prof.maritalStatus;
  if (prof.locality) profile.locality = prof.locality;
  if (prof.address) profile.address = prof.address;

  return profile;
}

function buildContextFromResponse(data) {
  if (!data || typeof data !== 'object') return {};
  const context = {};
  if (data.service?.code) context.serviceCode = data.service.code;
  if (data.currentServiceCode) context.currentServiceCode = data.currentServiceCode;
  if (data.currentService) context.currentService = data.currentService;
  if (data.lastIntent) context.lastIntent = data.lastIntent;
  if (data.lastTopic) context.lastTopic = data.lastTopic;
  if (data.intent) context.intent = data.intent;
  if (data.sdmOffice) context.sdmOffice = data.sdmOffice;
  if (data.lastLocality) context.lastLocality = data.lastLocality;
  if (data.lastSdmOffice) context.lastSdmOffice = data.lastSdmOffice;
  if (Array.isArray(data.recentMessages)) context.recentMessages = data.recentMessages;
  if (data.eligibilityProfile && typeof data.eligibilityProfile === 'object') context.eligibilityProfile = data.eligibilityProfile;
  if (data.pendingEligibilityField) context.pendingEligibilityField = data.pendingEligibilityField;
  return context;
}

export default function ChatbotWidget({ isOpen, onClose, citizenProfile }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I’m Dilli Sahayak. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en'); // 'en' or 'hi'
  const [selectedSdmOffice, setSelectedSdmOffice] = useState(null);
  const [conversationContext, setConversationContext] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [messageFeedback, setMessageFeedback] = useState({});

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  const quickPrompts = language === 'hi'
    ? ['OBC मानदंड जांचें', 'SDM कार्यालय खोजें', 'EWS प्रमाणपत्र']
    : ['Check OBC Criteria', 'Find SDM Office', 'EWS Certificate'];
  const userProfile = useMemo(() => {
    let storedProfile = {};
    try {
      const raw = sessionStorage.getItem('sd_eligibility_profile');
      if (raw) storedProfile = JSON.parse(raw);
    } catch {
      storedProfile = {};
    }
    return toChatbotProfile({ ...storedProfile, ...citizenProfile });
  }, [citizenProfile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

const blobToBase64 = (blob) => (
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  })
);
const handleVoiceInput = async () => {
  if (loading) return;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    setMessages(prev => [
      ...prev,
      {
        sender: 'bot',
        text: 'Voice input is not supported in this browser.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    return;
  }

  if (isRecording) {
    mediaRecorderRef.current?.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = async () => {
      setIsRecording(false);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      if (!audioChunksRef.current.length) return;

      try {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const audioBase64 = await blobToBase64(blob);
        const speech = await transcribeSpeech(audioBase64, language === 'hi' ? 'hi' : 'en');

        if (speech.status === 'success' && speech.transcription) {
          setInput(String(speech.transcription).trim());
          return;
        }

        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: speech.status === 'configuration_required'
              ? 'Voice service is currently unavailable. You can continue using text chat.'
              : (speech.message || 'Could not transcribe the recorded audio.'),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch {
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: 'Could not process voice input right now. Please try again.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    };

    recorder.start();
    setIsRecording(true);
  } catch {
    setIsRecording(false);
    setMessages(prev => [
      ...prev,
      {
        sender: 'bot',
        text: 'Microphone access is needed for voice input.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }
};
  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const newMsg = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      const recentMessages = messages.slice(-8).map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));
      const payloadContext = {
        ...conversationContext,
        recentMessages,
        currentService: conversationContext.currentService || conversationContext.serviceTitle || null,
        currentServiceCode: conversationContext.currentServiceCode || conversationContext.serviceCode || null,
        lastIntent: conversationContext.lastIntent || conversationContext.intent || null,
        lastTopic: conversationContext.lastTopic || null
      };
      const mergedProfile = {
        ...userProfile,
        ...(conversationContext.eligibilityProfile || {})
      };
      const responseData = await sendChatMessage(userText, mergedProfile, language, payloadContext);

      const botMsg = {
        sender: 'bot',
        text: responseData.answer_hi && language === 'hi'
          ? responseData.answer_hi
          : (responseData.answer || 'I could not process that request. Please try rephrasing your question.'),
        data: responseData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);
      setConversationContext(buildContextFromResponse(responseData));
    } catch {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Sorry, I am unable to connect to the Smart e-District assistance server right now. Please try again later.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
  };

  const handleCopyResponse = async (msgText, index) => {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    try {
      await navigator.clipboard.writeText(msgText);
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 1600);
    } catch {
      setCopiedMessageIndex(null);
    }
  };

  const handleMessageFeedback = (index, feedback) => {
    setMessageFeedback(prev => ({ ...prev, [index]: feedback }));
  };

  return (
    <section className="chatbot-modal" aria-label="Dilli Sahayak chat assistant">
      <header className="chatbot-header">
        <div className="chatbot-branding">
          <div className="chatbot-avatar" aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <div className="chatbot-title-wrap">
            <div className="chatbot-title-row">
              <h3>Dilli Sahayak</h3>
              <span className="chatbot-online-status">
                <span className="status-dot" aria-hidden="true" />
                Online
              </span>
            </div>
            <p>AI-powered citizen service guidance desk</p>
          </div>
        </div>

        <div className="chatbot-header-actions">
          <button
            type="button"
            className="chatbot-lang-toggle"
            onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
            title="Toggle Language (BHASHINI)"
          >
            {language === 'en' ? 'हिन्दी' : 'English'}
          </button>
          <button type="button" className="chatbot-close" onClick={onClose} aria-label="Close assistant">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="chatbot-messages">
        {messages.map((msg, idx) => (
          <article key={idx} className={`chat-row ${msg.sender === 'user' ? 'chat-row-user' : 'chat-row-bot'}`}>
            {msg.sender === 'bot' && (
              <div className="chat-avatar-thumb" aria-hidden="true">
                <Bot size={14} />
              </div>
            )}

            <div className="chat-message-block">
              <div className={`chat-bubble ${msg.sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}>
                <div>{msg.text}</div>
                {msg.data && renderStructuredContent(msg.data, setSelectedSdmOffice, navigate, setInput)}
              </div>

              <div className="chat-meta-row">
                <span className="chat-timestamp">{msg.timestamp}</span>
                {msg.sender === 'bot' && (
                  <div className="chat-feedback-actions">
                    <button
                      type="button"
                      className="chat-icon-action"
                      onClick={() => handleCopyResponse(msg.text, idx)}
                      aria-label="Copy response"
                      title={copiedMessageIndex === idx ? 'Copied' : 'Copy response'}
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      type="button"
                      className={`chat-icon-action ${messageFeedback[idx] === 'up' ? 'active' : ''}`}
                      onClick={() => handleMessageFeedback(idx, 'up')}
                      aria-label="Helpful response"
                      title="Mark as helpful"
                    >
                      <ThumbsUp size={13} />
                    </button>
                    <button
                      type="button"
                      className={`chat-icon-action ${messageFeedback[idx] === 'down' ? 'active' : ''}`}
                      onClick={() => handleMessageFeedback(idx, 'down')}
                      aria-label="Not helpful response"
                      title="Mark as not helpful"
                    >
                      <ThumbsDown size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}

        {loading && (
          <div className="chat-loading-state">
            <span className="chat-loading-dot" aria-hidden="true" />
            Checking official e-District records...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-input-shell">
        <div className="chat-quick-chips" role="list" aria-label="Suggested prompts">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              role="listitem"
              className="quick-chip"
              onClick={() => handleQuickPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={handleSend} className="chat-input-bar">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={language === 'hi' ? 'अपना प्रश्न लिखें (जैसे documents for EWS)...' : 'Ask about documents, eligibility, or SDM office...'}
          />
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={loading}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
            className={`chat-control-btn mic ${isRecording ? 'recording' : ''}`}
          >
            {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <button
            type="submit"
            disabled={!input.trim() || loading || isRecording}
            className={`chat-control-btn send ${input.trim() && !loading && !isRecording ? 'ready' : ''}`}
          >
            <SendHorizontal size={15} />
            <span>{input.trim() ? 'Send' : 'Ask'}</span>
          </button>
        </form>
      </div>

      {/* Render AR/VR Guidance Modal if selected */}
      {selectedSdmOffice && (
        <ArVrGuidanceModal
          sdmOffice={selectedSdmOffice}
          onClose={() => setSelectedSdmOffice(null)}
        />
      )}
    </section>
  );
}

function renderStructuredContent(data, onOpenArvr, onNavigate, onPrefillInput) {
  if (!data) return null;

  return (
    <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Service Card */}
      {data.service && (
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '6px',
          padding: '0.625rem 0.75rem'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>
            Identified Service
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b' }}>
            {data.service.title}
          </div>
        </div>
      )}

      {/* Verification Status Badge */}
      {data.verificationStatus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            textTransform: 'uppercase',
            backgroundColor: data.verificationStatus === 'verified' ? '#dcfce7' : (data.verificationStatus === 'partially_verified' ? '#fef9c3' : '#fee2e2'),
            color: data.verificationStatus === 'verified' ? '#166534' : (data.verificationStatus === 'partially_verified' ? '#854d0e' : '#991b1b'),
            border: `1px solid ${data.verificationStatus === 'verified' ? '#86efac' : (data.verificationStatus === 'partially_verified' ? '#fde047' : '#fca5a5')}`
          }}>
            Status: {data.verificationStatus}
          </span>
        </div>
      )}

      {/* Processing Time */}
      {data.processingTime?.citizenMessage && (
        <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '0.625rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0369a1', marginBottom: '0.25rem' }}>
            ⏱️ Processing Time:
          </div>
          <div style={{ fontSize: '0.8rem', color: '#0c4a6e' }}>{data.processingTime.citizenMessage}</div>
        </div>
      )}

      {/* Application Procedure */}
      {data.procedure && data.procedure.length > 0 && (
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.625rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0f172a', marginBottom: '0.25rem' }}>
            📋 Application Steps:
          </div>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155' }}>
            {data.procedure.map((step, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>{step}</li>
            ))}
          </ol>
          {data.whereToApply && (
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.375rem' }}>
              Where to apply: {data.whereToApply}
            </div>
          )}
        </div>
      )}

      {/* Documents Section */}
      {data.documents && (data.documents.onlineSubmission?.length > 0 || data.documents.officeVerification?.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Online Submission List */}
          {data.documents.onlineSubmission?.length > 0 && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.625rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                💻 Online Upload Documents:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#334155' }}>
                {data.documents.onlineSubmission.map((doc, i) => (
                  <li key={i}>{doc.name || doc}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Office Verification List */}
          {data.documents.officeVerification?.length > 0 && (
            <div style={{ backgroundColor: '#fffbe5', border: '1px solid #fde047', borderRadius: '6px', padding: '0.625rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#713f12', marginBottom: '0.25rem' }}>
                🏢 Physical Office Verification Documents:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#854d0e' }}>
                {data.documents.officeVerification.map((doc, i) => (
                  <li key={i}>{doc.name || doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Required Profile Fields Prompt */}
      {data.requiredProfileFields && data.requiredProfileFields.length > 0 && (
        <div style={{ backgroundColor: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '6px', padding: '0.625rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#c2410c', marginBottom: '0.25rem' }}>
            Information Needed For Evaluation:
          </div>
          <div style={{ fontSize: '0.775rem', color: '#9a3412' }}>
            Please mention: {data.requiredProfileFields.join(', ')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#9a3412', marginTop: '0.375rem' }}>
            Or complete the <Link to="/eligibility" style={{ color: '#c2410c', fontWeight: 600 }}>Eligibility questionnaire</Link> first — your answers will be used here.
          </div>
        </div>
      )}

      {/* SDM Office Card */}
      {data.sdmOffice && data.sdmOffice.sdmOffice && (
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '0.625rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#15803d', marginBottom: '0.25rem' }}>
            📍 Designated SDM Office: {data.sdmOffice.sdmOffice.name}
          </div>
          <div style={{ fontSize: '0.775rem', color: '#166534', marginBottom: '0.5rem' }}>
            {data.sdmOffice.sdmOffice.address}
          </div>

          <button
            type="button"
            onClick={() => onOpenArvr(data.sdmOffice)}
            style={{
              padding: '0.375rem 0.75rem',
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
          >
            🧭 Open AR/VR Office Guidance
          </button>
        </div>
      )}
      {Array.isArray(data.actions) && data.actions.map((action) => (
        action.type === 'navigate' && action.to ? (
          <button
            key={`${action.type}-${action.to}`}
            type="button"
            onClick={() => onNavigate(action.to)}
            style={{
              alignSelf: 'flex-start',
              padding: '0.45rem 0.75rem',
              border: '1px solid #166534',
              borderRadius: '4px',
              backgroundColor: '#166534',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {action.label}
          </button>
        ) : null
      ))}
      {Array.isArray(data.actions) && data.actions.map((action) => (
        action.type === 'message' && action.message ? (
          <button
            key={`${action.type}-${action.label}-${action.message}`}
            type="button"
            onClick={() => onPrefillInput(action.message)}
            style={{
              alignSelf: 'flex-start',
              padding: '0.45rem 0.75rem',
              border: '1px solid #334155',
              borderRadius: '4px',
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {action.label}
          </button>
        ) : null
      ))}
    </div>
  );
}
