import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from 'react-router-dom';
import {
  Copy,
  Check,
  Mic,
  MicOff,
  SendHorizontal,
  ThumbsDown,
  ThumbsUp,
  X
} from 'lucide-react';

import {
  sendChatMessage,
  transcribeSpeech
} from '../services/chatbot';

import ArVrGuidanceModal from './ArVrGuidanceModal';
import '../styles/chatbotWidget.css';

/* =========================================================
   PROFILE NORMALIZATION
========================================================= */

function toChatbotProfile(prof = {}) {
  if (!prof || typeof prof !== 'object') return {};

  const profile = {};

  if (
    prof.age !== '' &&
    prof.age !== undefined &&
    prof.age !== null
  ) {
    const age = Number(prof.age);

    if (Number.isFinite(age)) {
      profile.age = age;
    }
  }

  if (prof.delhiResident !== undefined) {
    profile.delhiResident = Boolean(prof.delhiResident);
  } else if (prof.residency !== undefined) {
    profile.delhiResident = Boolean(prof.residency);
  }

  if (
    prof.residenceYears !== '' &&
    prof.residenceYears !== undefined &&
    prof.residenceYears !== null
  ) {
    const years = Number(prof.residenceYears);

    if (Number.isFinite(years)) {
      profile.residenceYears = years;
    }
  }

  if (prof.aadhaar !== undefined) {
    profile.aadhaar = Boolean(prof.aadhaar);
  } else if (prof.hasAadhaar !== undefined) {
    profile.aadhaar = Boolean(prof.hasAadhaar);
  }

  if (prof.receivesOtherPension !== undefined) {
    profile.receivesOtherPension =
      Boolean(prof.receivesOtherPension);
  }

  if (
    prof.income !== '' &&
    prof.income !== undefined &&
    prof.income !== null
  ) {
    const income = Number(prof.income);

    if (Number.isFinite(income)) {
      profile.income = income;
    }
  }

  if (prof.gender) {
    profile.gender = prof.gender;
  }

  if (prof.category) {
    profile.category = String(
      prof.category
    ).toLowerCase();
  }

  if (prof.occupation) {
    profile.occupation = prof.occupation;
  }

  if (
    prof.disability === true ||
    prof.disability === 'yes'
  ) {
    profile.disability = 'yes';
  } else if (
    prof.disability === false ||
    prof.disability === 'no'
  ) {
    profile.disability = 'no';
  }

  if (
    prof.disabilityPercentage !== '' &&
    prof.disabilityPercentage !== undefined &&
    prof.disabilityPercentage !== null
  ) {
    const percentage = Number(
      prof.disabilityPercentage
    );

    if (Number.isFinite(percentage)) {
      profile.disabilityPercentage = percentage;
    }
  }

  if (prof.maritalStatus) {
    profile.maritalStatus = prof.maritalStatus;
  }

  if (prof.locality) {
    profile.locality = prof.locality;
  }

  if (prof.address) {
    profile.address = prof.address;
  }

  return profile;
}

/* =========================================================
   RESPONSE NORMALIZATION
========================================================= */

function normalizeResponseData(response) {
  if (
    response === null ||
    response === undefined
  ) {
    return {};
  }

  /*
   * Object response
   */
  if (typeof response === 'object') {
    /*
     * Axios-style response:
     * { data: {...} }
     */
    if (
      response.data !== undefined &&
      response.data !== response
    ) {
      const normalized =
        normalizeResponseData(response.data);

      return {
        ...response,
        ...normalized
      };
    }

    /*
     * Nested response:
     * { response: {...} }
     */
    if (
      response.response !== undefined &&
      typeof response.response !== 'string'
    ) {
      const normalized =
        normalizeResponseData(response.response);

      return {
        ...response,
        ...normalized
      };
    }

    /*
     * Already a useful chatbot object
     */
    if (
      typeof response.answer === 'string' &&
      response.answer.trim()
    ) {
      return {
        ...response,
        answer: response.answer
      };
    }

    return response;
  }

  /*
   * String response
   */
  if (typeof response === 'string') {
    let value = response.trim();

    /*
     * Remove markdown JSON fences
     */
    value = value
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    /*
     * Try parsing JSON
     */
    try {
      const parsed = JSON.parse(value);

      return normalizeResponseData(parsed);
    } catch {
      /*
       * Plain text response
       */
      return {
        answer: value
      };
    }
  }

  return {
    answer: String(response)
  };
}

/* =========================================================
   CONTEXT BUILDER
========================================================= */

function buildContextFromResponse(data) {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return {};
  }

  const context = {};

  if (data.service?.code) {
    context.serviceCode =
      data.service.code;
  }

  if (data.currentServiceCode) {
    context.currentServiceCode =
      data.currentServiceCode;
  }

  if (data.currentService) {
    context.currentService =
      data.currentService;
  }

  if (data.serviceTitle) {
    context.serviceTitle =
      data.serviceTitle;
  }

  if (data.lastIntent) {
    context.lastIntent =
      data.lastIntent;
  }

  if (data.lastTopic) {
    context.lastTopic =
      data.lastTopic;
  }

  if (data.intent) {
    context.intent =
      data.intent;
  }

  if (data.sdmOffice) {
    context.sdmOffice =
      data.sdmOffice;
  }

  if (Array.isArray(data.recentMessages)) {
    context.recentMessages =
      data.recentMessages;
  }

  return context;
}

/* =========================================================
   MARKDOWN MESSAGE
========================================================= */

function MarkdownMessage({ content }) {
  return (
    <div
      style={{
        whiteSpace: 'normal',
        overflowWrap: 'anywhere'
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p
              style={{
                margin: '0 0 0.5rem',
                whiteSpace: 'pre-wrap'
              }}
            >
              {children}
            </p>
          ),

          ul: ({ children }) => (
            <ul
              style={{
                margin: '0.35rem 0 0.5rem 1.2rem',
                paddingLeft: '1rem',
                listStyleType: 'disc'
              }}
            >
              {children}
            </ul>
          ),

          ol: ({ children }) => (
            <ol
              style={{
                margin: '0.35rem 0 0.5rem 1.2rem',
                paddingLeft: '1rem'
              }}
            >
              {children}
            </ol>
          ),

          li: ({ children }) => (
            <li
              style={{
                marginBottom: '0.25rem'
              }}
            >
              {children}
            </li>
          ),

          strong: ({ children }) => (
            <strong
              style={{
                fontWeight: 700
              }}
            >
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em
              style={{
                fontStyle: 'italic'
              }}
            >
              {children}
            </em>
          ),

          br: () => <br />,

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{
                color: '#2563eb',
                textDecoration: 'underline'
              }}
            >
              {children}
            </a>
          )
        }}
      >
        {String(content || '')}
      </ReactMarkdown>
    </div>
  );
}

/* =========================================================
   MAIN CHATBOT
========================================================= */

export default function ChatbotWidget({
  isOpen,
  onClose,
  citizenProfile
}) {
  /* =======================================================
     STATE
  ======================================================= */

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text:
        'Namaste! I’m Dilli Sahayak. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  ]);

  const [input, setInput] = useState('');

  const [loading, setLoading] =
    useState(false);

  const [language, setLanguage] =
    useState('en');

  const [userProfile, setUserProfile] =
    useState({});

  const [selectedSdmOffice, setSelectedSdmOffice] =
    useState(null);

  const [conversationContext, setConversationContext] =
    useState({});

  const [isRecording, setIsRecording] =
    useState(false);

  const [copiedMessageIndex, setCopiedMessageIndex] =
    useState(null);

  const [messageFeedback, setMessageFeedback] =
    useState({});

  /* =======================================================
     REFS
  ======================================================= */

  const messagesEndRef =
    useRef(null);

  const mediaRecorderRef =
    useRef(null);

  const mediaStreamRef =
    useRef(null);

  const audioChunksRef =
    useRef([]);

  /* =======================================================
     LOAD USER PROFILE
  ======================================================= */

  useEffect(() => {
    let storedProfile = {};

    try {
      const raw =
        sessionStorage.getItem(
          'sd_eligibility_profile'
        );

      if (raw) {
        storedProfile =
          JSON.parse(raw);
      }
    } catch {
      storedProfile = {};
    }

    const mergedProfile = {
      ...storedProfile,
      ...(citizenProfile || {})
    };

    setUserProfile(
      toChatbotProfile(
        mergedProfile
      )
    );
  }, [citizenProfile]);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [messages, loading]);

  /* =======================================================
     MICROPHONE CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      try {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state !==
            'inactive'
        ) {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignore recorder cleanup errors
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current
          .getTracks()
          .forEach(track => track.stop());

        mediaStreamRef.current = null;
      }
    };
  }, []);

  /* =======================================================
     RESET RECORDING WHEN LANGUAGE CHANGES
  ======================================================= */

  useEffect(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !==
        'inactive'
    ) {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
  }, [language]);

  if (!isOpen) {
    return null;
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  const getTimestamp = () =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

  const addBotMessage = text => {
    setMessages(prev => [
      ...prev,
      {
        sender: 'bot',
        text,
        timestamp: getTimestamp()
      }
    ]);
  };

  /* =======================================================
     BLOB -> BASE64
  ======================================================= */

  const blobToBase64 = blob => {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend = () => {
          const result =
            String(
              reader.result || ''
            );

          const base64 =
            result.includes(',')
              ? result.split(',')[1]
              : result;

          resolve(base64);
        };

        reader.onerror = reject;

        reader.readAsDataURL(blob);
      }
    );
  };

  /* =======================================================
     VOICE INPUT
  ======================================================= */

  const handleVoiceInput =
    async () => {
      if (loading) return;

      /*
       * Browser support
       */
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia ||
        !window.MediaRecorder
      ) {
        addBotMessage(
          'Voice input is not supported in this browser. Please use Chrome, Edge, or another modern browser.'
        );

        return;
      }

      /*
       * Stop current recording
       */
      if (isRecording) {
        try {
          mediaRecorderRef.current?.stop();
        } catch {
          setIsRecording(false);
        }

        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true
            }
          );

        mediaStreamRef.current =
          stream;

        let mimeType = '';

        const supportedTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4'
        ];

        for (const type of supportedTypes) {
          if (
            MediaRecorder.isTypeSupported(
              type
            )
          ) {
            mimeType = type;
            break;
          }
        }

        const recorder =
          mimeType
            ? new MediaRecorder(
                stream,
                { mimeType }
              )
            : new MediaRecorder(
                stream
              );

        mediaRecorderRef.current =
          recorder;

        audioChunksRef.current = [];

        recorder.ondataavailable =
          event => {
            if (
              event.data &&
              event.data.size > 0
            ) {
              audioChunksRef.current.push(
                event.data
              );
            }
          };

        recorder.onstop =
          async () => {
            setIsRecording(false);

            if (
              mediaStreamRef.current
            ) {
              mediaStreamRef.current
                .getTracks()
                .forEach(track =>
                  track.stop()
                );

              mediaStreamRef.current =
                null;
            }

            if (
              !audioChunksRef.current
                .length
            ) {
              return;
            }

            try {
              const blob =
                new Blob(
                  audioChunksRef.current,
                  {
                    type:
                      recorder.mimeType ||
                      'audio/webm'
                  }
                );

              const audioBase64 =
                await blobToBase64(
                  blob
                );

              const speech =
                await transcribeSpeech(
                  audioBase64,
                  language === 'hi'
                    ? 'hi'
                    : 'en'
                );

              if (
                speech?.status ===
                  'success' &&
                speech?.transcription
              ) {
                setInput(
                  String(
                    speech.transcription
                  ).trim()
                );

                return;
              }

              addBotMessage(
                speech?.status ===
                  'configuration_required'
                  ? 'Voice service is currently unavailable. You can continue using text chat.'
                  : speech?.message ||
                      'Could not transcribe the recorded audio.'
              );
            } catch (error) {
              console.error(
                'VOICE TRANSCRIPTION ERROR:',
                error
              );

              addBotMessage(
                'Could not process voice input right now. Please try again.'
              );
            }
          };

        recorder.onerror =
          () => {
            setIsRecording(false);

            addBotMessage(
              'There was a problem recording your voice. Please try again.'
            );
          };

        recorder.start();

        setIsRecording(true);
      } catch (error) {
        console.error(
          'MICROPHONE ERROR:',
          error
        );

        setIsRecording(false);

        addBotMessage(
          'Microphone access is needed for voice input. Please allow microphone permission and try again.'
        );
      }
    };

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  const handleSend = async e => {
    if (e) {
      e.preventDefault();
    }

    const userText =
      input.trim();

    if (
      !userText ||
      loading ||
      isRecording
    ) {
      return;
    }

    /*
     * User message
     */
    const newMsg = {
      sender: 'user',
      text: userText,
      timestamp: getTimestamp()
    };

    /*
     * Immediately display user message
     */
    setMessages(prev => [
      ...prev,
      newMsg
    ]);

    setInput('');
    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * Include the current message in recentMessages.
       */
      const recentMessages = [
        ...messages,
        newMsg
      ]
        .slice(-8)
        .map(msg => ({
          sender: msg.sender,
          text: msg.text
        }));

      /*
       * Build backend context
       */
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

      console.log(
        'CHATBOT REQUEST:',
        {
          message: userText,
          profile: userProfile,
          language,
          context: payloadContext
        }
      );

      /*
       * Call backend
       */
      const rawResponse =
        await sendChatMessage(
          userText,
          userProfile,
          language,
          payloadContext
        );

      console.log(
        'RAW CHATBOT RESPONSE:',
        rawResponse
      );

      /*
       * Normalize backend/Lyzr response
       */
      const responseData =
        normalizeResponseData(
          rawResponse
        );

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
        typeof responseData.answer_hi ===
          'string' &&
        responseData.answer_hi.trim()
      ) {
        answer =
          responseData.answer_hi;
      } else if (
        typeof responseData.response ===
          'string' &&
        responseData.response.trim()
      ) {
        answer =
          responseData.response;
      } else if (
        typeof responseData.answer ===
          'string' &&
        responseData.answer.trim()
      ) {
        answer =
          responseData.answer;
      } else if (
        typeof responseData.message ===
          'string' &&
        responseData.message.trim()
      ) {
        answer =
          responseData.message;
      } else {
        answer =
          'I could not process that request. Please try rephrasing your question.';
      }

      /*
       * Sometimes answer itself is JSON.
       */
      try {
        const parsedAnswer =
          JSON.parse(
            String(answer)
          );

        if (
          parsedAnswer &&
          typeof parsedAnswer ===
            'object'
        ) {
          if (
            language === 'hi' &&
            typeof parsedAnswer.answer_hi ===
              'string'
          ) {
            answer =
              parsedAnswer.answer_hi;
          } else if (
            typeof parsedAnswer.response ===
              'string'
          ) {
            answer =
              parsedAnswer.response;
          } else if (
            typeof parsedAnswer.answer ===
              'string'
          ) {
            answer =
              parsedAnswer.answer;
          } else if (
            typeof parsedAnswer.message ===
              'string'
          ) {
            answer =
              parsedAnswer.message;
          }
        }
      } catch {
        /*
         * Answer is normal text.
         */
      }

      /*
       * Add bot response
       */
      const botMsg = {
        sender: 'bot',
        text: String(answer),
        data: responseData,
        timestamp: getTimestamp()
      };

      setMessages(prev => [
        ...prev,
        botMsg
      ]);

      /*
       * Preserve previous context while
       * adding new context.
       */
      setConversationContext(
        prev => ({
          ...prev,
          ...buildContextFromResponse(
            responseData
          )
        })
      );
    } catch (err) {
      console.error(
        'CHATBOT FRONTEND ERROR:',
        err
      );

      addBotMessage(
        'Sorry, I am unable to connect to the Smart e-District assistance server right now. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     QUICK PROMPT
  ======================================================= */

  const handleQuickPrompt =
    prompt => {
      if (loading) return;

      setInput(prompt);
    };

  /* =======================================================
     COPY RESPONSE
  ======================================================= */

  const handleCopyResponse =
    async (
      msgText,
      index
    ) => {
      if (
        !navigator.clipboard ||
        !navigator.clipboard.writeText
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          msgText
        );

        setCopiedMessageIndex(
          index
        );

        setTimeout(() => {
          setCopiedMessageIndex(
            null
          );
        }, 1600);
      } catch (error) {
        console.error(
          'COPY ERROR:',
          error
        );

        setCopiedMessageIndex(
          null
        );
      }
    };

  /* =======================================================
     MESSAGE FEEDBACK
  ======================================================= */

  const handleMessageFeedback =
    (
      index,
      feedback
    ) => {
      setMessageFeedback(
        prev => ({
          ...prev,
          [index]: feedback
        })
      );
    };

  /* =======================================================
     CLEAR CHAT
  ======================================================= */

  const handleClearChat =
    () => {
      setMessages([
        {
          sender: 'bot',
          text:
            language === 'hi'
              ? 'नमस्ते! मैं दिल्ली सहायक हूँ। मैं आपकी कैसे मदद कर सकता हूँ?'
              : 'Namaste! I’m Dilli Sahayak. How can I help you today?',
          timestamp: getTimestamp()
        }
      ]);

      setConversationContext({});
      setSelectedSdmOffice(null);
      setInput('');
    };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      id="dilli-sahayak"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        width: '420px',
        maxWidth:
          'calc(100vw - 2rem)',
        height: '620px',
        maxHeight:
          'calc(100vh - 3rem)',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow:
          '0 20px 25px -5px rgba(15, 23, 42, 0.25), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
        border:
          '1px solid #cbd5e1',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
        overflow: 'hidden',
        fontFamily:
          'Inter, system-ui, -apple-system, sans-serif'
      }}
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <header
        style={{
          backgroundColor: '#1e3a8a',
          color: '#ffffff',
          padding:
            '0.8rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',
          borderBottom:
            '2px solid #3b82f6'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            minWidth: 0
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: '50%',
              backgroundColor:
                '#ffffff',
              color: '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
              fontWeight: 800,
              fontSize: '1rem'
            }}
          >
            🏛️
          </div>

          <div
            style={{
              minWidth: 0
            }}
          >
            <div
              style={{
                fontSize:
                  '0.95rem',
                fontWeight: 700
              }}
            >
              Dilli Sahayak
            </div>

            <div
              style={{
                fontSize:
                  '0.7rem',
                color: '#bfdbfe',
                fontWeight: 500
              }}
            >
              Government service guidance desk
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >

          {/* Language */}
          <button
            type="button"
            onClick={() =>
              setLanguage(prev =>
                prev === 'en'
                  ? 'hi'
                  : 'en'
              )
            }
            title="Toggle language"
            style={{
              border: '1px solid rgba(255,255,255,0.3)',
              backgroundColor:
                'rgba(255,255,255,0.08)',
              color: '#ffffff',
              borderRadius: '6px',
              padding:
                '0.35rem 0.55rem',
              fontSize:
                '0.7rem',
              cursor: 'pointer'
            }}
          >
            {language === 'en'
              ? 'हिन्दी'
              : 'English'}
          </button>

          {/* Clear */}
          <button
            type="button"
            onClick={
              handleClearChat
            }
            title="Clear conversation"
            style={{
              border: 'none',
              background:
                'transparent',
              color: '#dbeafe',
              cursor: 'pointer',
              fontSize:
                '0.7rem',
              padding:
                '0.35rem'
            }}
          >
            Clear
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            style={{
              border: 'none',
              background:
                'transparent',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              padding:
                '0.3rem'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* =================================================
          QUICK PROMPTS
      ================================================= */}

      {messages.length <= 1 &&
        !loading && (
          <div
            style={{
              padding:
                '0.65rem 0.75rem',
              backgroundColor:
                '#ffffff',
              borderBottom:
                '1px solid #e2e8f0',
              display: 'flex',
              gap: '0.4rem',
              overflowX: 'auto'
            }}
          >
            {[
              language === 'hi'
                ? 'EWS के दस्तावेज'
                : 'Documents for EWS',

              language === 'hi'
                ? 'आवेदन कैसे करें?'
                : 'How to apply?',

              language === 'hi'
                ? 'SDM कार्यालय'
                : 'Find my SDM office'
            ].map(prompt => (
              <button
                key={prompt}
                type="button"
                onClick={() =>
                  handleQuickPrompt(
                    prompt
                  )
                }
                style={{
                  whiteSpace:
                    'nowrap',
                  border:
                    '1px solid #bfdbfe',
                  backgroundColor:
                    '#eff6ff',
                  color:
                    '#1e40af',
                  borderRadius:
                    '999px',
                  padding:
                    '0.35rem 0.65rem',
                  fontSize:
                    '0.7rem',
                  cursor:
                    'pointer'
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

      {/* =================================================
          MESSAGES
      ================================================= */}

      <div
        style={{
          flex: 1,
          padding: '1rem',
          overflowY: 'auto',
          backgroundColor:
            '#f8fafc',
          display: 'flex',
          flexDirection:
            'column',
          gap: '0.9rem'
        }}
      >
        {messages.map(
          (msg, idx) => (
            <div
              key={idx}
              style={{
                alignSelf:
                  msg.sender ===
                  'user'
                    ? 'flex-end'
                    : 'flex-start',
                maxWidth: '90%',
                minWidth: 0
              }}
            >

              {/* Message bubble */}

              <div
                style={{
                  padding:
                    '0.8rem 0.9rem',
                  borderRadius:
                    msg.sender ===
                    'user'
                      ? '12px 12px 3px 12px'
                      : '12px 12px 12px 3px',
                  backgroundColor:
                    msg.sender ===
                    'user'
                      ? '#1e3a8a'
                      : '#ffffff',
                  color:
                    msg.sender ===
                    'user'
                      ? '#ffffff'
                      : '#1e293b',
                  border:
                    msg.sender ===
                    'user'
                      ? 'none'
                      : '1px solid #e2e8f0',
                  boxShadow:
                    '0 1px 2px rgba(0,0,0,0.05)',
                  fontSize:
                    '0.875rem',
                  lineHeight:
                    '1.5',
                  overflowWrap:
                    'anywhere'
                }}
              >
                {msg.sender ===
                'user' ? (
                  <div>
                    {msg.text}
                  </div>
                ) : (
                  <MarkdownMessage
                    content={
                      msg.text
                    }
                  />
                )}

                {msg.data &&
                  renderStructuredContent(
                    msg.data,
                    setSelectedSdmOffice
                  )}
              </div>

              {/* Message actions */}

              {msg.sender ===
                'bot' &&
                idx > 0 && (
                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: '0.25rem',
                      marginTop:
                        '0.3rem'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyResponse(
                          msg.text,
                          idx
                        )
                      }
                      title="Copy response"
                      style={{
                        border:
                          'none',
                        background:
                          'transparent',
                        color:
                          '#64748b',
                        cursor:
                          'pointer',
                        padding:
                          '0.25rem',
                        display:
                          'flex'
                      }}
                    >
                      {copiedMessageIndex ===
                      idx ? (
                        <Check
                          size={
                            14
                          }
                        />
                      ) : (
                        <Copy
                          size={
                            14
                          }
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleMessageFeedback(
                          idx,
                          'up'
                        )
                      }
                      title="Helpful"
                      style={{
                        border:
                          'none',
                        background:
                          messageFeedback[
                            idx
                          ] ===
                          'up'
                            ? '#dcfce7'
                            : 'transparent',
                        color:
                          messageFeedback[
                            idx
                          ] ===
                          'up'
                            ? '#166534'
                            : '#64748b',
                        cursor:
                          'pointer',
                        padding:
                          '0.25rem',
                        borderRadius:
                          '4px',
                        display:
                          'flex'
                      }}
                    >
                      <ThumbsUp
                        size={14}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleMessageFeedback(
                          idx,
                          'down'
                        )
                      }
                      title="Not helpful"
                      style={{
                        border:
                          'none',
                        background:
                          messageFeedback[
                            idx
                          ] ===
                          'down'
                            ? '#fee2e2'
                            : 'transparent',
                        color:
                          messageFeedback[
                            idx
                          ] ===
                          'down'
                            ? '#991b1b'
                            : '#64748b',
                        cursor:
                          'pointer',
                        padding:
                          '0.25rem',
                        borderRadius:
                          '4px',
                        display:
                          'flex'
                      }}
                    >
                      <ThumbsDown
                        size={14}
                      />
                    </button>
                  </div>
                )}

              {/* Timestamp */}

              <div
                style={{
                  fontSize:
                    '0.65rem',
                  color:
                    '#94a3b8',
                  marginTop:
                    '0.15rem',
                  textAlign:
                    msg.sender ===
                    'user'
                      ? 'right'
                      : 'left'
                }}
              >
                {msg.timestamp}
              </div>
            </div>
          )
        )}

        {/* Loading */}

        {loading && (
          <div
            style={{
              alignSelf:
                'flex-start',
              backgroundColor:
                '#ffffff',
              border:
                '1px solid #e2e8f0',
              borderRadius:
                '12px 12px 12px 3px',
              padding:
                '0.7rem 0.85rem',
              color:
                '#64748b',
              fontSize:
                '0.78rem'
            }}
          >
            <span>
              Checking official e-District records
            </span>
            <span
              style={{
                marginLeft:
                  '0.25rem'
              }}
            >
              ...
            </span>
          </div>
        )}

        <div
          ref={
            messagesEndRef
          }
        />
      </div>

      {/* =================================================
          INPUT
      ================================================= */}

      <form
        onSubmit={
          handleSend
        }
        style={{
          padding:
            '0.7rem 0.8rem',
          backgroundColor:
            '#ffffff',
          borderTop:
            '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: '0.4rem'
          }}
        >
          <input
            type="text"
            value={input}
            onChange={e =>
              setInput(
                e.target.value
              )
            }
            disabled={loading}
            placeholder={
              language ===
              'hi'
                ? 'अपना प्रश्न लिखें...'
                : 'Ask about documents, eligibility, or SDM office...'
            }
            aria-label="Chat message"
            style={{
              flex: 1,
              minWidth: 0,
              padding:
                '0.65rem 0.75rem',
              borderRadius:
                '8px',
              border:
                '1px solid #cbd5e1',
              fontSize:
                '0.85rem',
              outline:
                'none'
            }}
          />

          {/* Voice */}

          <button
            type="button"
            onClick={
              handleVoiceInput
            }
            disabled={loading}
            title={
              isRecording
                ? 'Stop recording'
                : 'Start voice input'
            }
            aria-label={
              isRecording
                ? 'Stop recording'
                : 'Start voice input'
            }
            style={{
              width: '40px',
              height: '40px',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              backgroundColor:
                isRecording
                  ? '#b91c1c'
                  : '#2563eb',
              color:
                '#ffffff',
              border: 'none',
              borderRadius:
                '8px',
              cursor:
                loading
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                loading
                  ? 0.6
                  : 1
            }}
          >
            {isRecording ? (
              <MicOff
                size={18}
              />
            ) : (
              <Mic
                size={18}
              />
            )}
          </button>

          {/* Send */}

          <button
            type="submit"
            disabled={
              !input.trim() ||
              loading ||
              isRecording
            }
            title="Send message"
            aria-label="Send message"
            style={{
              width: '40px',
              height: '40px',
              display:
                'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              backgroundColor:
                !input.trim() ||
                loading ||
                isRecording
                  ? '#94a3b8'
                  : '#1e3a8a',
              color:
                '#ffffff',
              border: 'none',
              borderRadius:
                '8px',
              cursor:
                !input.trim() ||
                loading ||
                isRecording
                  ? 'not-allowed'
                  : 'pointer'
            }}
          >
            <SendHorizontal
              size={18}
            />
          </button>
        </div>

        <div
          style={{
            marginTop:
              '0.35rem',
            textAlign:
              'center',
            fontSize:
              '0.62rem',
            color:
              '#94a3b8'
          }}
        >
          Dilli Sahayak provides guidance based on available e-District information.
        </div>
      </form>

      {/* =================================================
          AR/VR GUIDANCE
      ================================================= */}

      {selectedSdmOffice && (
        <ArVrGuidanceModal
          sdmOffice={
            selectedSdmOffice
          }
          onClose={() =>
            setSelectedSdmOffice(
              null
            )
          }
        />
      )}
    </div>
  );
}

/* =========================================================
   STRUCTURED RESPONSE RENDERER
========================================================= */

function renderStructuredContent(
  data,
  onOpenArvr
) {
  if (
    !data ||
    typeof data !== 'object'
  ) {
    return null;
  }

  return (
    <div
      style={{
        marginTop:
          '0.75rem',
        display:
          'flex',
        flexDirection:
          'column',
        gap: '0.65rem'
      }}
    >

      {/* =================================================
          SERVICE CARD
      ================================================= */}

      {data.service && (
        <div
          style={{
            backgroundColor:
              '#eff6ff',
            border:
              '1px solid #bfdbfe',
            borderRadius:
              '7px',
            padding:
              '0.65rem 0.75rem'
          }}
        >
          <div
            style={{
              fontSize:
                '0.65rem',
              fontWeight: 700,
              color:
                '#1e40af',
              textTransform:
                'uppercase',
              letterSpacing:
                '0.03em'
            }}
          >
            Identified Service
          </div>

          <div
            style={{
              marginTop:
                '0.15rem',
              fontWeight: 600,
              fontSize:
                '0.85rem',
              color:
                '#1e293b'
            }}
          >
            {data.service.title ||
              data.service.name ||
              data.service.code}
          </div>
        </div>
      )}

      {/* =================================================
          VERIFICATION STATUS
      ================================================= */}

      {data.verificationStatus && (
        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap:
              '0.5rem'
          }}
        >
          <span
            style={{
              fontSize:
                '0.65rem',
              fontWeight: 700,
              padding:
                '0.25rem 0.5rem',
              borderRadius:
                '4px',
              textTransform:
                'uppercase',
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
              border:
                `1px solid ${
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
            Status:{' '}
            {String(
              data.verificationStatus
            ).replace(
              /_/g,
              ' '
            )}
          </span>
        </div>
      )}

      {/* =================================================
          PROCESSING TIME
      ================================================= */}

      {data.processingTime
        ?.citizenMessage && (
        <div
          style={{
            backgroundColor:
              '#f0f9ff',
            border:
              '1px solid #bae6fd',
            borderRadius:
              '7px',
            padding:
              '0.65rem'
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize:
                '0.72rem',
              color:
                '#0369a1',
              marginBottom:
                '0.25rem'
            }}
          >
            ⏱️ Processing Time
          </div>

          <div
            style={{
              fontSize:
                '0.78rem',
              color:
                '#0c4a6e'
            }}
          >
            {
              data.processingTime
                .citizenMessage
            }
          </div>
        </div>
      )}

      {/* =================================================
          APPLICATION PROCEDURE
      ================================================= */}

      {Array.isArray(
        data.procedure
      ) &&
        data.procedure
          .length > 0 && (
          <div
            style={{
              backgroundColor:
                '#f8fafc',
              border:
                '1px solid #e2e8f0',
              borderRadius:
                '7px',
              padding:
                '0.65rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize:
                  '0.72rem',
                color:
                  '#0f172a',
                marginBottom:
                  '0.35rem'
              }}
            >
              📋 Application Steps
            </div>

            <ol
              style={{
                margin: 0,
                paddingLeft:
                  '1.25rem',
                fontSize:
                  '0.78rem',
                color:
                  '#334155'
              }}
            >
              {data.procedure.map(
                (step, i) => (
                  <li
                    key={i}
                    style={{
                      marginBottom:
                        '0.25rem'
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
                  fontSize:
                    '0.72rem',
                  color:
                    '#64748b',
                  marginTop:
                    '0.45rem'
                }}
              >
                <strong>
                  Where to apply:
                </strong>{' '}
                {
                  data.whereToApply
                }
              </div>
            )}
          </div>
        )}

      {/* =================================================
          DOCUMENTS
      ================================================= */}

      {data.documents &&
        (
          data.documents
            .onlineSubmission
            ?.length > 0 ||
          data.documents
            .officeVerification
            ?.length > 0
        ) && (
          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap:
                '0.5rem'
            }}
          >

            {/* Online documents */}

            {data.documents
              .onlineSubmission
              ?.length > 0 && (
              <div
                style={{
                  backgroundColor:
                    '#f8fafc',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius:
                    '7px',
                  padding:
                    '0.65rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize:
                      '0.72rem',
                    color:
                      '#0f172a',
                    marginBottom:
                      '0.3rem'
                  }}
                >
                  💻 Online Upload Documents
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft:
                      '1.25rem',
                    fontSize:
                      '0.78rem',
                    color:
                      '#334155'
                  }}
                >
                  {data.documents
                    .onlineSubmission
                    .map(
                      (
                        doc,
                        i
                      ) => (
                        <li
                          key={
                            i
                          }
                        >
                          {typeof doc ===
                          'object'
                            ? doc.name ||
                              doc.title ||
                              JSON.stringify(
                                doc
                              )
                            : doc}
                        </li>
                      )
                    )}
                </ul>
              </div>
            )}

            {/* Office documents */}

            {data.documents
              .officeVerification
              ?.length > 0 && (
              <div
                style={{
                  backgroundColor:
                    '#fffbe5',
                  border:
                    '1px solid #fde047',
                  borderRadius:
                    '7px',
                  padding:
                    '0.65rem'
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize:
                      '0.72rem',
                    color:
                      '#713f12',
                    marginBottom:
                      '0.3rem'
                  }}
                >
                  🏢 Physical Office Verification Documents
                </div>

                <ul
                  style={{
                    margin: 0,
                    paddingLeft:
                      '1.25rem',
                    fontSize:
                      '0.78rem',
                    color:
                      '#854d0e'
                  }}
                >
                  {data.documents
                    .officeVerification
                    .map(
                      (
                        doc,
                        i
                      ) => (
                        <li
                          key={
                            i
                          }
                        >
                          {typeof doc ===
                          'object'
                            ? doc.name ||
                              doc.title ||
                              JSON.stringify(
                                doc
                              )
                            : doc}
                        </li>
                      )
                    )}
                </ul>
              </div>
            )}
          </div>
        )}

      {/* =================================================
          REQUIRED PROFILE FIELDS
      ================================================= */}

      {Array.isArray(
        data.requiredProfileFields
      ) &&
        data.requiredProfileFields
          .length > 0 && (
          <div
            style={{
              backgroundColor:
                '#fff7ed',
              border:
                '1px solid #ffedd5',
              borderRadius:
                '7px',
              padding:
                '0.65rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize:
                  '0.72rem',
                color:
                  '#c2410c',
                marginBottom:
                  '0.25rem'
              }}
            >
              Information Needed For Evaluation
            </div>

            <div
              style={{
                fontSize:
                  '0.77rem',
                color:
                  '#9a3412'
              }}
            >
              Please mention:{' '}
              {data.requiredProfileFields.join(
                ', '
              )}
            </div>

            <div
              style={{
                fontSize:
                  '0.72rem',
                color:
                  '#9a3412',
                marginTop:
                  '0.4rem'
              }}
            >
              Or complete the{' '}
              <Link
                to="/eligibility"
                style={{
                  color:
                    '#c2410c',
                  fontWeight: 600
                }}
              >
                Eligibility questionnaire
              </Link>{' '}
              first — your answers will be used here.
            </div>
          </div>
        )}

      {/* =================================================
          SDM OFFICE
      ================================================= */}

      {data.sdmOffice &&
        data.sdmOffice
          .sdmOffice && (
          <div
            style={{
              backgroundColor:
                '#f0fdf4',
              border:
                '1px solid #bbf7d0',
              borderRadius:
                '7px',
              padding:
                '0.65rem'
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize:
                  '0.72rem',
                color:
                  '#15803d',
                marginBottom:
                  '0.25rem'
              }}
            >
              📍 Designated SDM Office
            </div>

            <div
              style={{
                fontWeight: 600,
                fontSize:
                  '0.8rem',
                color:
                  '#166534'
              }}
            >
              {
                data.sdmOffice
                  .sdmOffice
                  .name
              }
            </div>

            <div
              style={{
                fontSize:
                  '0.75rem',
                color:
                  '#166534',
                marginTop:
                  '0.2rem',
                marginBottom:
                  '0.5rem'
              }}
            >
              {
                data.sdmOffice
                  .sdmOffice
                  .address
              }
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenArvr(
                  data.sdmOffice
                )
              }
              style={{
                padding:
                  '0.4rem 0.7rem',
                backgroundColor:
                  '#166534',
                color:
                  '#ffffff',
                border: 'none',
                borderRadius:
                  '5px',
                fontWeight: 600,
                fontSize:
                  '0.72rem',
                cursor:
                  'pointer',
                display:
                  'inline-flex',
                alignItems:
                  'center',
                gap:
                  '0.35rem'
              }}
            >
              🧭 Open AR/VR Office Guidance
            </button>
          </div>
        )}
    </div>
  );
}

