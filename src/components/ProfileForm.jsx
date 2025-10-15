import React, { useState } from 'react';

/**
 * ProfileForm collects basic information about the user.  Once the
 * form is submitted, it invokes the onSubmit callback provided by
 * the parent component with the name and age values.  Both fields
 * are required to proceed.
 */
export default function ProfileForm({ onSubmit }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ name, age });
  };

  return (
    <section className="screen">
      <h2>Dicci qualcosa di te</h2>
      <form onSubmit={handleSubmit} className="profile-form">
        <label>
          Nome:
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Età:
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            required
            min="0"
          />
        </label>
        <button type="submit">Procedi</button>
      </form>
    </section>
  );
}
