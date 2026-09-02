import { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
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

  if (prof.delhiResident !== undefined) {
    profile.delhiResident = !!prof.delhiResident;
  } else if (prof.residency !== undefined) {
    profile.delhiResident = !!prof.residency;
  }

  if (
    prof.residenceYears !== '' &&
    prof.residenceYears !== undefined &&
    prof.residenceYears !== null
  ) {
    profile.residenceYears = Number(prof.residenceYears);
  }

  if (prof.aadhaar !== undefined) {
    profile.aadhaar = !!prof.aadhaar;
  } else if (prof.hasAadhaar !== undefined) {
    profile.aadhaar = !!prof.hasAadhaar;
  }

  if (prof.receivesOtherPension !== undefined) {
    profile.receivesOtherPension = !!prof.receivesOtherPension;
  }

  if (prof.income !== '' && prof.income !== undefined && prof.income !== null) {
    profile.income = Number(prof.income);
  }

  if (prof.gender) profile.gender = prof.gender;

  if (prof.category) {
    profile.category = String(prof.category).toLowerCase();
  }

  if (prof.occupation) profile.occupation = prof.occupation;

  if (prof.disability === true || prof.disability === 'yes') {
    profile.disability = 'yes';
  } else if (prof.disability === false || prof.disability === 'no') {
    profile.disability = 'no';
  }

  if (
    prof.disabilityPercentage !== '' &&
    prof.disabilityPercentage !== undefined &&
    prof.disabilityPercentage !== null
  ) {
    profile.disabilityPercentage = Number(prof.disabilityPercentage);
  }

  if (prof.maritalStatus) profile.maritalStatus = prof.maritalStatus;
  if (prof.locality) profile.locality = prof.locality;
  if (prof.address) profile.address = prof.address;

  return profile;
}

/*
 * IMPORTANT:
 * Lyzr/backend may sometimes return JSON as a STRING instead of
 * an actual JavaScript object.
 *
 * This function keeps parsing until we get a usable object.
 */
function normalizeResponseData(response) {
  if (response === null || response === undefined) {
    return {};
  }

  if (typeof response === 'object') {
    if (response.data !== undefined) {
      return normalizeResponseData(response.data);
    }

    if (response.response !== undefined) {
      const safeResponse = normalizeResponseData(response.response);
      return {
        ...response,
        ...safeResponse,
        answer:
          typeof safeResponse.answer === 'string'
            ? safeResponse.answer
            : typeof response.answer === 'string'
              ? response.answer
              : typeof response.response === 'string'
                ? response.response
                : ''
      };
    }

    if (typeof response.answer === 'string' && response.answer.trim()) {
      return {
        ...response,
        answer: response.answer
      };
    }

    return response;
  }

  if (typeof response === 'string') {
    let value = response.trim();

    value = value
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(value);
      return normalizeResponseData(parsed);
    } catch (error) {
      return {
        answer: value
      };
    }
  }

  return {
    answer: String(response)
  };
}

function buildContextFromResponse(data) {
  if (!data || typeof data !== 'object') return {};

  const context = {};

  if (data.service?.code) {
    context.serviceCode = data.service.code;
  }

  if (data.currentServiceCode) {
    context.currentServiceCode = data.currentServiceCode;
  }

  if (data.currentService) {
    context.currentService = data.currentService;
  }

  if (data.lastIntent) {
    context.lastIntent = data.lastIntent;
  }

  if (data.lastTopic) {
    context.lastTopic = data.lastTopic;
  }

  if (data.intent) {
    context.intent = data.intent;
  }

  if (data.sdmOffice) {
    context.sdmOffice = data.sdmOffice;
  }

  if (Array.isArray(data.recentMessages)) {
    context.recentMessages = data.recentMessages;
  }

  return context;
}

function MarkdownMessage({ content }) {
  return (
    <div style={{ whiteSpace: 'normal' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>{children}</p>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '0.35rem 0 0.5rem 1.2rem', paddingLeft: '1rem', listStyleType: 'disc' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '0.35rem 0 0.5rem 1.2rem', paddingLeft: '1rem' }}>{children}</ol>
          ),
          li: ({ children }) => <li style={{ marginBottom: '0.25rem' }}>{children}</li>,
          strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
          br: () => <br />,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>{children}</a>
          )
        }}
      >
        {String(content || '')}
      </ReactMarkdown>
    </div>
  );
}

export default function ChatbotWidget({
  isOpen,
  onClose,
  citizenProfile
}) {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Namaste! I’m Dilli Sahayak. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [selectedSdmOffice, setSelectedSdmOffice] = useState(null);
  const [conversationContext, setConversationContext] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [messageFeedback, setMessageFeedback] = useState({});

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    let storedProfile = {};

    try {
      const raw = sessionStorage.getItem('sd_eligibility_profile');

      if (raw) {
        storedProfile = JSON.parse(raw);
      }
    } catch {
      // ignore invalid session data
    }
    setUserProfile(toChatbotProfile({ ...storedProfile, ...citizenProfile }));
  }, [citizenProfile]);

  /*
   * Auto-scroll chat
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, loading]);

  /*
   * Cleanup microphone
   */
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  if (!isOpen) return null;

  /*
   * Convert audio Blob -> Base64
   */
  const blobToBase64 = blob => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        const result = String(reader.result || '');

        const base64 = result.includes(',')
          ? result.split(',')[1]
          : result;

        resolve(base64);
      };

      reader.onerror = reject;

      reader.readAsDataURL(blob);
    });
  };

  /*
   * Voice input
   */
  const handleVoiceInput = async () => {
    if (loading) return;

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia ||
      !window.MediaRecorder
    ) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Voice input is not supported in this browser.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]);

      return;
    }

    /*
     * Stop recording
     */
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setIsRecording(false);

        if (mediaStreamRef.current) {
          mediaStreamRef.current
            .getTracks()
            .forEach(track => track.stop());

          mediaStreamRef.current = null;
        }

        if (!audioChunksRef.current.length) return;

        try {
          const blob = new Blob(
            audioChunksRef.current,
            {
              type: recorder.mimeType || 'audio/webm'
            }
          );

          const audioBase64 = await blobToBase64(blob);

          const speech = await transcribeSpeech(
            audioBase64,
            language === 'hi' ? 'hi' : 'en'
          );

          if (
            speech.status === 'success' &&
            speech.transcription
          ) {
            setInput(String(speech.transcription).trim());
            return;
          }

          setMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text:
                speech.status === 'configuration_required'
                  ? 'Voice service is currently unavailable. You can continue using text chat.'
                  : (
                      speech.message ||
                      'Could not transcribe the recorded audio.'
                    ),
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
            }
          ]);
        } catch {
          setMessages(prev => [
            ...prev,
            {
              sender: 'bot',
              text:
                'Could not process voice input right now. Please try again.',
              timestamp: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })
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
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      ]);
    }
  };

  /*
   * SEND MESSAGE
   */
  const handleSend = async e => {
    if (e) e.preventDefault();

    if (!input.trim() || loading) return;

    const userText = input.trim();

    setInput('');

    const newMsg = {
      sender: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    setMessages(prev => [...prev, newMsg]);

    setLoading(true);

    try {
      /*
       * Send last 8 messages as conversational memory
       */
      const recentMessages = messages
        .slice(-8)
        .map(msg => ({
          sender: msg.sender,
          text: msg.text
        }));

      const payloadContext = {
        ...conversationContext,

        recentMessages,

        currentService:
          conversationContext.currentService ||
          conversationContext.serviceTitle ||
          null,

        currentServiceCode:
          conversationContext.currentServiceCode ||
          conversationContext.serviceCode ||
          null,

        lastIntent:
          conversationContext.lastIntent ||
          conversationContext.intent ||
          null,

        lastTopic:
          conversationContext.lastTopic ||
          null
      };

      /*
       * Call backend
       */
      const rawResponse = await sendChatMessage(
        userText,
        userProfile,
        language,
        payloadContext
      );

      /*
       * VERY IMPORTANT:
       * Normalize / parse backend response.
       */
      console.log('RAW CHATBOT RESPONSE:', rawResponse);

      const responseData =
        normalizeResponseData(rawResponse);

      console.log(
        'PARSED CHATBOT RESPONSE:',
        responseData
      );

      /*
       * Determine answer
       */
      let answer = '';

      if (
        language === 'hi' &&
        responseData.answer_hi
      ) {
        answer = responseData.answer_hi;
      } else if (
        typeof responseData.response === 'string' &&
        responseData.response.trim()
      ) {
        answer = responseData.response;
      } else if (
        typeof responseData.answer === 'string' &&
        responseData.answer.trim()
      ) {
        answer = responseData.answer;
      } else if (
        typeof responseData.message === 'string' &&
        responseData.message.trim()
      ) {
        answer = responseData.message;
      } else {
        answer =
          'I could not process that request. Please try rephrasing your question.';
      }

      try {
        const parsedAnswer = JSON.parse(String(answer));
        if (parsedAnswer && typeof parsedAnswer === 'object') {
          if (language === 'hi' && typeof parsedAnswer.answer_hi === 'string') {
            answer = parsedAnswer.answer_hi;
          } else if (typeof parsedAnswer.response === 'string') {
            answer = parsedAnswer.response;
          } else if (typeof parsedAnswer.answer === 'string') {
            answer = parsedAnswer.answer;
          }
        }
      } catch {
        // Keep the current answer if it is not JSON.
      }

      const botMsg = {
        sender: 'bot',
        text: String(answer),
        data: responseData,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      };

      setMessages(prev => [...prev, botMsg]);
      setConversationContext(buildContextFromResponse(responseData));
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text:
            'Sorry, I am unable to connect to the Smart e-District assistance server right now. Please try again later.',
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })
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
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      width: '420px',
      maxWidth: 'calc(100vw - 2rem)',
      height: '620px',
      maxHeight: 'calc(100vh - 3rem)',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      border: '1px solid #cbd5e1',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 9990,
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Official Government Header */}
      <div style={{
        backgroundColor: '#1e3a8a',
        color: '#ffffff',
        padding: '0.875rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '2px solid #3b82f6'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            color: '#1e3a8a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.9rem'
          }}>
            🏛️
          </div>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Dilli Sahayak
            </div>
            <div style={{ fontSize: '0.725rem', color: '#bfdbfe', fontWeight: 500 }}>
              Government service guidance desk
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Language Toggle Control */}
          <button
            type="button"
            onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
            title="Toggle Language (BHASHINI)"
          >
            {language === 'en' ? 'हिन्दी (BHASHINI)' : 'English'}
          </button>
          <button type="button" className="chatbot-close" onClick={onClose} aria-label="Close assistant">
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        backgroundColor: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map((msg, idx) => (
          <div key={idx} style={{
            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%'
          }}>
            <div style={{
              padding: '0.875rem 1rem',
              borderRadius: msg.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              backgroundColor: msg.sender === 'user' ? '#1e3a8a' : '#ffffff',
              color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
              border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}>
              <div>{msg.text}</div>

              {/* Render Structured Response Elements if available */}
              {msg.data && renderStructuredContent(msg.data, setSelectedSdmOffice)}
            </div>

            <div style={{
              fontSize: '0.675rem',
              color: '#94a3b8',
              marginTop: '0.25rem',
              textAlign: msg.sender === 'user' ? 'right' : 'left'
            }}>
              {msg.timestamp}
            </div>
          </article>
        ))}

        {loading && (
          <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
            Checking official e-District records...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <form onSubmit={handleSend} style={{
        padding: '0.75rem 1rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={language === 'hi' ? 'अपना प्रश्न लिखें (जैसे documents for EWS)...' : 'Ask about documents, eligibility, or SDM office...'}
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem',
            outline: 'none'
          }}
        />
        <button
          type="button"
          onClick={handleVoiceInput}
          disabled={loading}
          title={isRecording ? 'Stop recording' : 'Start voice input'}
          style={{
            padding: '0.625rem 0.75rem',
            backgroundColor: isRecording ? '#b91c1c' : '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {isRecording ? '■' : '🎤'}
        </button>
        <button
          type="submit"
          disabled={!input.trim() || loading || isRecording}
          style={{
            padding: '0.625rem 1rem',
            backgroundColor: !input.trim() || loading || isRecording ? '#94a3b8' : '#1e3a8a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: !input.trim() || loading || isRecording ? 'not-allowed' : 'pointer'
          }}
        >
          Send
        </button>
      </form>

      {/* AR/VR Guidance */}

      {selectedSdmOffice && (
        <ArVrGuidanceModal
          sdmOffice={selectedSdmOffice}
          onClose={() =>
            setSelectedSdmOffice(null)
          }
        />
      )}
    </section>
  );
}

/*
 * Structured response renderer
 */
function renderStructuredContent(
  data,
  onOpenArvr
) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return (
    <div
      style={{
        marginTop: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >

      {/* Service Card */}

      {data.service && (
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '0.625rem 0.75rem'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#1e40af',
              textTransform: 'uppercase'
            }}
          >
            Identified Service
          </div>

          <div
            style={{
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#1e293b'
            }}
          >
            {data.service.title}
          </div>
        </div>
      )}

      {/* Verification Status */}

      {data.verificationStatus && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              backgroundColor:
                data.verificationStatus ===
                'verified'
                  ? '#dcfce7'
                  : data.verificationStatus ===
                    'partially_verified'
                  ? '#fef9c3'
                  : '#fee2e2',
              color:
                data.verificationStatus ===
                'verified'
                  ? '#166534'
                  : data.verificationStatus ===
                    'partially_verified'
                  ? '#854d0e'
                  : '#991b1b',
              border: `1px solid ${
                data.verificationStatus ===
                'verified'
                  ? '#86efac'
                  : data.verificationStatus ===
                    'partially_verified'
                  ? '#fde047'
                  : '#fca5a5'
              }`
            }}
          >
            Status: {data.verificationStatus}
          </span>
        </div>
      )}

      {/* Processing Time */}

      {data.processingTime?.citizenMessage && (
        <div
          style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            padding: '0.625rem'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#0369a1',
              marginBottom: '0.25rem'
            }}
          >
            ⏱️ Processing Time:
          </div>

          <div
            style={{
              fontSize: '0.8rem',
              color: '#0c4a6e'
            }}
          >
            {data.processingTime.citizenMessage}
          </div>
        </div>
      )}

      {/* Application Procedure */}

      {Array.isArray(data.procedure) &&
        data.procedure.length > 0 && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.625rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#0f172a',
                marginBottom: '0.25rem'
              }}
            >
              📋 Application Steps:
            </div>

            <ol
              style={{
                margin: 0,
                paddingLeft: '1.25rem',
                fontSize: '0.8rem',
                color: '#334155'
              }}
            >
              {data.procedure.map(
                (step, i) => (
                  <li
                    key={i}
                    style={{
                      marginBottom: '0.25rem'
                    }}
                  >
                    {step}
                  </li>
                )
              )}
            </ol>

            {data.whereToApply && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  marginTop: '0.375rem'
                }}
              >
                Where to apply: {data.whereToApply}
              </div>
            )}
          </div>
        )}

      {/* Documents */}

      {data.documents &&
        (
          data.documents.onlineSubmission?.length >
            0 ||
          data.documents.officeVerification?.length >
            0
        ) && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >

            {data.documents.onlineSubmission?.length >
              0 && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.625rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#0f172a',
                    marginBottom: '0.25rem'
                  }}
                >
                  💻 Online Upload Documents:
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    fontSize: '0.8rem',
                    color: '#334155'
                  }}
                >
                  {data.documents.onlineSubmission.map(
                    (doc, i) => (
                      <li key={i}>
                        {doc.name || doc}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}

            {data.documents.officeVerification?.length >
              0 && (
              <div
                style={{
                  backgroundColor: '#fffbe5',
                  border: '1px solid #fde047',
                  borderRadius: '6px',
                  padding: '0.625rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#713f12',
                    marginBottom: '0.25rem'
                  }}
                >
                  🏢 Physical Office Verification Documents:
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft: '1.25rem',
                    fontSize: '0.8rem',
                    color: '#854d0e'
                  }}
                >
                  {data.documents.officeVerification.map(
                    (doc, i) => (
                      <li key={i}>
                        {doc.name || doc}
                      </li>
                    )
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

      {/* Required Profile Fields */}

      {Array.isArray(data.requiredProfileFields) &&
        data.requiredProfileFields.length > 0 && (
          <div
            style={{
              backgroundColor: '#fff7ed',
              border: '1px solid #ffedd5',
              borderRadius: '6px',
              padding: '0.625rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#c2410c',
                marginBottom: '0.25rem'
              }}
            >
              Information Needed For Evaluation:
            </div>

            <div
              style={{
                fontSize: '0.775rem',
                color: '#9a3412'
              }}
            >
              Please mention:{' '}
              {data.requiredProfileFields.join(
                ', '
              )}
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: '#9a3412',
                marginTop: '0.375rem'
              }}
            >
              Or complete the{' '}
              <Link
                to="/eligibility"
                style={{
                  color: '#c2410c',
                  fontWeight: 600
                }}
              >
                Eligibility questionnaire
              </Link>{' '}
              first — your answers will be used here.
            </div>
          </div>
        )}

      {/* SDM Office */}

      {data.sdmOffice &&
        data.sdmOffice.sdmOffice && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '0.625rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#15803d',
                marginBottom: '0.25rem'
              }}
            >
              📍 Designated SDM Office:{' '}
              {data.sdmOffice.sdmOffice.name}
            </div>

            <div
              style={{
                fontSize: '0.775rem',
                color: '#166534',
                marginBottom: '0.5rem'
              }}
            >
              {data.sdmOffice.sdmOffice.address}
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenArvr(data.sdmOffice)
              }
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
    </div>
  );
}