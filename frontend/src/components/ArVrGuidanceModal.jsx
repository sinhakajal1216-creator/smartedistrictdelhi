import React, { useState, useEffect } from 'react';

export default function ArVrGuidanceModal({ sdmOffice, onClose }) {
  const [arSupported, setArSupported] = useState(false);
  const [activeMode, setActiveMode] = useState('guided'); // 'guided' or 'ar'
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if WebXR or camera stream capabilities exist
    if (navigator.xr || (navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      setArSupported(true);
    } else {
      setArSupported(false);
    }
  }, []);

  if (!sdmOffice || !sdmOffice.sdmOffice) return null;

  const office = sdmOffice.sdmOffice;
  const jurisdiction = sdmOffice.sdmJurisdiction;

  const navigationSteps = [
    {
      title: '1. Destination & Office Reaching',
      detail: `Proceed to ${office.name} SDM Office. Address: ${office.address} (Pincode: ${office.pincode || '1100XX'}).`,
      instruction: 'Confirm district boundary (District: ' + (jurisdiction.area || 'Delhi') + ') upon arrival.',
      icon: '🏛️'
    },
    {
      title: '2. Entrance & Main Gate Verification',
      detail: 'Locate Main Gate Reception / Public Inquiry Counter.',
      instruction: 'Report to Security Desk for entry token and preliminary document screening.',
      icon: '🚪'
    },
    {
      title: '3. Token & Helpdesk Counter',
      detail: 'Proceed to General Public Service Facilitation Counter (Counter 1 / Token Counter).',
      instruction: 'Show your e-District online application reference number or request manual token.',
      icon: '🎟️'
    },
    {
      title: '4. Service Counter Submission',
      detail: `Proceed to ${jurisdiction.subDivision || 'Revenue'} Sub-Division Dealing Assistant Desk (Counters 3-5).`,
      instruction: 'Hand over your signed application form along with mandatory self-attested supporting documents.',
      icon: '📋'
    },
    {
      title: '5. Physical Verification & Receipt',
      detail: 'Original Document Verification Desk.',
      instruction: 'Present original identity proof & address proof ONLY when requested by the dealing official. Obtain stamped physical acknowledgment receipt.',
      icon: '✅'
    },
    {
      title: '6. Accessibility & Citizen Facilities',
      detail: 'Senior Citizen & PwD Assistance.',
      instruction: 'Wheelchair access ramps are available at Main Entrance. Priority counters are available for Senior Citizens and Persons with Special Needs.',
      icon: '♿'
    }
  ];

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, navigationSteps.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        maxWidth: '680px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          backgroundColor: '#1e3a8a',
          color: '#ffffff',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: '#93c5fd', textTransform: 'uppercase' }}>
              Smart e-District Delhi — Office Navigation Guidance
            </div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
              SDM Office AR/VR Assistant: {office.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '1.5rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          borderBottom: '1px solid #e2e8f0',
          padding: '0.5rem 1.5rem 0'
        }}>
          <button
            onClick={() => setActiveMode('guided')}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeMode === 'guided' ? '3px solid #1e3a8a' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeMode === 'guided' ? '#1e3a8a' : '#64748b',
              cursor: 'pointer'
            }}
          >
            🧭 Guided Interactive Office Mode
          </button>
          <button
            onClick={() => setActiveMode('ar')}
            style={{
              padding: '0.625rem 1.25rem',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              borderBottom: activeMode === 'ar' ? '3px solid #1e3a8a' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeMode === 'ar' ? '#1e3a8a' : '#64748b',
              cursor: 'pointer'
            }}
          >
            📹 Live AR Camera Overlay
          </button>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          {activeMode === 'ar' && (
            <div style={{
              backgroundColor: '#fffbe5',
              border: '1px solid #fde047',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.25rem',
              color: '#854d0e',
              fontSize: '0.875rem'
            }}>
              <strong>AR Camera Hardware Detection Notice:</strong>
              <div style={{ marginTop: '0.5rem' }}>
                {arSupported ? (
                  <span>Camera API detected. Live AR indoor navigation requires active camera permissions and physical presence inside the SDM office premises.</span>
                ) : (
                  <span>WebXR/Hardware AR spatial sensors are unavailable on this browser device. Displaying 3D Guided Step-by-Step Office Plan.</span>
                )}
              </div>
            </div>
          )}

          {/* Office Quick Card */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: '#475569', marginBottom: '0.25rem' }}>
              <strong>Target Locality:</strong> {sdmOffice.locality} | <strong>MCD Ward:</strong> {sdmOffice.ward} (#{sdmOffice.wardNumber})
            </div>
            <div style={{ fontSize: '0.875rem', color: '#475569' }}>
              <strong>Official Address:</strong> {office.address}
            </div>
            {office.contact?.phone && (
              <div style={{ fontSize: '0.875rem', color: '#475569', marginTop: '0.25rem' }}>
                <strong>Contact Phone:</strong> {office.contact.phone}
              </div>
            )}
          </div>

          {/* Current Step Guidance Display */}
          <div style={{
            border: '2px solid #3b82f6',
            borderRadius: '10px',
            padding: '1.25rem',
            backgroundColor: '#eff6ff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '2rem' }}>{navigationSteps[currentStep].icon}</span>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase' }}>
                  Step {currentStep + 1} of {navigationSteps.length}
                </span>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
                  {navigationSteps[currentStep].title}
                </h4>
              </div>
            </div>
            <p style={{ margin: '0 0 0.75rem 0', color: '#334155', fontSize: '0.95rem', lineHeight: '1.5' }}>
              {navigationSteps[currentStep].detail}
            </p>
            <div style={{
              backgroundColor: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              borderLeft: '4px solid #2563eb',
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              <strong>Official Instruction:</strong> {navigationSteps[currentStep].instruction}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          padding: '1rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: currentStep === 0 ? '#f1f5f9' : '#ffffff',
              color: currentStep === 0 ? '#94a3b8' : '#334155',
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            ← Previous Step
          </button>

          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>
            {currentStep + 1} / {navigationSteps.length}
          </span>

          <button
            onClick={nextStep}
            disabled={currentStep === navigationSteps.length - 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: currentStep === navigationSteps.length - 1 ? '#94a3b8' : '#1e3a8a',
              color: '#ffffff',
              cursor: currentStep === navigationSteps.length - 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              fontSize: '0.875rem'
            }}
          >
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
}
