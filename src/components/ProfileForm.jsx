import React, { useState } from 'react';

/**
 * ProfileForm collects information about the user's culinary preferences,
 * focusing on Italian cuisine. When the form is submitted, it invokes 
 * the onSubmit callback with the collected data.
 */
export default function ProfileForm({ onSubmit }) {
  const [experience, setExperience] = useState('');
  const [favouriteDish, setFavouriteDish] = useState('');
  const [dietaryPref, setDietaryPref] = useState('');
  const [region, setRegion] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ experience, favouriteDish, dietaryPref, region });
  };

  return (
    <section className="screen">
      <div className="card">
        <h2>Parlaci della tua esperienza con la cucina italiana</h2>
        <form onSubmit={handleSubmit} className="profile-form">
          <label>
            Livello di esperienza culinaria:
            <select value={experience} onChange={(e) => setExperience(e.target.value)} required>
              <option value="">Seleziona...</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzato">Avanzato</option>
              <option value="chef">Chef professionista</option>
            </select>
          </label>
          <label>
            Piatto italiano preferito:
            <input type="text" value={favouriteDish} onChange={(e) => setFavouriteDish(e.target.value)} placeholder="Lasagne, Carbonara, ecc." required />
          </label>
          <label>
            Preferenze dietetiche:
            <select value={dietaryPref} onChange={(e) => setDietaryPref(e.target.value)} required>
              <option value="">Seleziona...</option>
              <option value="nessuna">Nessuna</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="vegano">Vegano</option>
              <option value="senza-glutine">Senza glutine</option>
              <option value="altro">Altro</option>
            </select>
          </label>
          <label>
            Regione d'Italia di maggiore interesse:
            <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Toscana, Sicilia, Veneto..." required />
          </label>
          <button type="submit">Inizia l'esperienza</button>
        </form>
      </div>
    </section>
  );
}
