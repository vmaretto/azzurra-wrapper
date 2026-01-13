import React, { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import AzzurraAvatar from './components/AzzurraAvatar.jsx';
import Survey from './components/Survey.jsx';

export default function App() {
  const [step, setStep] = useState('welcome');
  const [profile, setProfile] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [duration, setDuration] = useState(null);
  const [azzurraOutput, setAzzurraOutput] = useState(null);

  useEffect(() => {
    if (step === 'azzurra') {
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

  return (
    <div className="app-container">
      {step === 'welcome' && <WelcomeScreen onNext={() => setStep('profile')} />}
      {step === 'profile' && (
        <ProfileForm
          onSubmit={(data) => {
            setProfile(data);
            setStep('azzurra');
          }}
        />
      )}
      {step === 'azzurra' && (
        <AzzurraAvatar
          onFinish={(output) => {
            setAzzurraOutput(output);
            setStep('survey');
          }}
        />
      )}
      {step === 'survey' && (
        <Survey
          duration={duration}
          profile={profile}
          output={azzurraOutput}
          onRestart={() => {
            setProfile(null);
            setAzzurraOutput(null);
            setDuration(null);
            setStep('welcome');
          }}
        />
      )}
    </div>
  );
}
