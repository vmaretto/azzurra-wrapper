import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import ModeSelection from './components/ModeSelection.jsx';
import AzzurraAvatar from './components/AzzurraAvatar.jsx';
import AzzurraChat from './components/AzzurraChat.jsx';
import Survey from './components/Survey.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  // Check for direct mode (skip welcome, form, and mode selection)
  const urlParams = new URLSearchParams(window.location.search);
  const isDirectMode = urlParams.get('direct') === 'true';
  const directModeType = urlParams.get('mode'); // 'avatar' or 'chat'

  // Determina step iniziale e modalità in base ai parametri URL
  const getInitialStep = () => {
    if (isDirectMode) {
      return directModeType === 'chat' ? 'chat' : 'avatar';
    }
    return 'welcome';
  };

  const getInitialMode = () => {
    if (isDirectMode && directModeType) {
      return directModeType;
    }
    return null;
  };

  const [step, setStep] = useState(getInitialStep());
  const [interactionMode, setInteractionMode] = useState(getInitialMode()); // 'avatar' o 'chat'
  const [profile, setProfile] = useState(isDirectMode ? {
    fasciaEta: 'Non specificato',
    sesso: 'Non specificato',
    rapportoCibo: 'Curioso',
    region: 'Non specificato'
  } : null);
  const [startTime, setStartTime] = useState(isDirectMode ? Date.now() : null);
  const [duration, setDuration] = useState(null);
  const [azzurraOutput, setAzzurraOutput] = useState(null);

  // Check if we're on /dashboard or /admin route (both go to dashboard)
  const isDashboardRoute = window.location.pathname === '/dashboard' || window.location.pathname === '/admin';

  useEffect(() => {
    if (step === 'azzurra' || step === 'avatar' || step === 'chat') {
      setStartTime(Date.now());
    }
    if (step === 'survey' && startTime) {
      setDuration(Math.round((Date.now() - startTime) / 1000));
    }
  }, [step, startTime]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('azzurraWrapperProfile', JSON.stringify(profile));
    }
  }, [profile]);

  // Gestione selezione modalità
  const handleModeSelection = (mode) => {
    setInteractionMode(mode);
    setStep(mode); // 'avatar' o 'chat'
  };

  // Gestione fine esperienza
  const handleFinish = (output) => {
    setAzzurraOutput(output);
    setStep('survey');
  };

  // Show dashboard if on /dashboard or /admin route (no password required)
  if (isDashboardRoute) {
    return <Dashboard />;
  }

  return (
    <div className="app-container">
      {step === 'welcome' && <WelcomeScreen onNext={() => setStep('profile')} />}

      {step === 'profile' && (
        <ProfileForm
          onSubmit={(data) => {
            setProfile(data);
            setStep('mode-selection');
          }}
        />
      )}

      {step === 'mode-selection' && (
        <ModeSelection onSelectMode={handleModeSelection} />
      )}

      {/* Legacy support: 'azzurra' step maps to avatar */}
      {(step === 'azzurra' || step === 'avatar') && (
        <AzzurraAvatar onFinish={handleFinish} />
      )}

      {step === 'chat' && (
        <AzzurraChat onFinish={handleFinish} />
      )}

      {step === 'survey' && (
        <Survey
          duration={duration}
          profile={profile}
          output={azzurraOutput}
          interactionMode={interactionMode}
          onRestart={() => {
            setProfile(null);
            setAzzurraOutput(null);
            setDuration(null);
            setInteractionMode(null);
            setStep('welcome');
          }}
        />
      )}
    </div>
  );
}
