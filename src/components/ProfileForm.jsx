import React, { useState } from 'react';

/**
 * ProfileForm collects demographic information about the user.
 * When the form is submitted, it invokes the onSubmit callback with the collected data.
 */
export default function ProfileForm({ onSubmit }) {
  const [sesso, setSesso] = useState('');
  const [fasciaEta, setFasciaEta] = useState('');
  const [titoloStudio, setTitoloStudio] = useState('');
  const [areaGeografica, setAreaGeografica] = useState('');
  const [rapportoCibo, setRapportoCibo] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ sesso, fasciaEta, titoloStudio, areaGeografica, rapportoCibo });
  };

  return (
    <section className="screen">
      <div className="card">
        <h2>Parlaci di te</h2>
        <p style={{ color: '#777', fontSize: '0.95rem', marginBottom: '0.5rem' }}>
          Compila il form per personalizzare la tua esperienza
        </p>
        <form onSubmit={handleSubmit} className="profile-form">
          <label>
            Sesso:
            <select
              value={sesso}
              onChange={(e) => setSesso(e.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              <option value="M">M</option>
              <option value="F">F</option>
              <option value="Non specificato">Non specificato</option>
            </select>
          </label>
          <label>
            Fascia Età:
            <select
              value={fasciaEta}
              onChange={(e) => setFasciaEta(e.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              <option value="<21 anni">&lt;21 anni</option>
              <option value="22-30 anni">22-30 anni</option>
              <option value="31-45 anni">31-45 anni</option>
              <option value="46-55 anni">46-55 anni</option>
              <option value="56-65 anni">56-65 anni</option>
              <option value=">65 anni">&gt;65 anni</option>
            </select>
          </label>
          <label>
            Titolo di studio:
            <select
              value={titoloStudio}
              onChange={(e) => setTitoloStudio(e.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              <option value="Diploma">Diploma</option>
              <option value="Laurea triennale">Laurea triennale</option>
              <option value="Laurea Magistrale">Laurea Magistrale</option>
              <option value="Master">Master</option>
            </select>
          </label>
          <label>
            Area Geografica:
            <select
              value={areaGeografica}
              onChange={(e) => setAreaGeografica(e.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              <option value="Nord">Nord</option>
              <option value="Centro">Centro</option>
              <option value="Sud">Sud</option>
              <option value="Isole">Isole</option>
            </select>
          </label>
          <label>
            Tu rispetto al cibo sei?
            <select
              value={rapportoCibo}
              onChange={(e) => setRapportoCibo(e.target.value)}
              required
            >
              <option value="">Seleziona...</option>
              <option value="Curioso">Curioso</option>
              <option value="Goloso">Goloso</option>
              <option value="Gourmet">Gourmet</option>
              <option value="Professionale">Professionale</option>
            </select>
          </label>
          <button type="submit">Inizia l'esperienza</button>
        </form>
      </div>
    </section>
  );
}
