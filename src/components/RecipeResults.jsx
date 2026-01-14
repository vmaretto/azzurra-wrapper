import React, { useState, useEffect } from 'react';

/**
 * RecipeResults mostra le ricette discusse durante la conversazione
 * con la possibilità di scaricare un PDF con i dettagli.
 */
export default function RecipeResults({ conversationHistory }) {
  const [recipes, setRecipes] = useState([]);
  const [pdfBase64, setPdfBase64] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRecipes() {
      if (!conversationHistory || conversationHistory.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/generate-recipe-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationHistory })
        });

        if (!response.ok) {
          throw new Error('Errore nel recupero delle ricette');
        }

        const data = await response.json();
        setRecipes(data.recipes || []);
        setPdfBase64(data.pdfBase64);

      } catch (err) {
        console.error('Errore:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecipes();
  }, [conversationHistory]);

  // Funzione per scaricare il PDF
  const downloadPDF = () => {
    if (!pdfBase64) return;

    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = 'ricette-azzurra.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="recipe-results loading">
        <p>Caricamento ricette...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="recipe-results error">
        <p>Errore: {error}</p>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="recipe-results empty">
        <p>Nessuna ricetta discussa in questa sessione.</p>
      </div>
    );
  }

  return (
    <div className="recipe-results">
      <h3>Ricette Discusse</h3>

      <ul className="recipe-list">
        {recipes.map((recipe, index) => (
          <li key={index} className="recipe-item">
            <span className="recipe-title">{recipe.titolo}</span>
            <span className="recipe-source">
              {recipe.ricettario}{recipe.anno ? ` (${recipe.anno})` : ''}
            </span>
          </li>
        ))}
      </ul>

      <div className="recipe-actions">
        {pdfBase64 && (
          <button
            type="button"
            className="download-btn"
            onClick={downloadPDF}
          >
            Scarica PDF Ricette
          </button>
        )}
      </div>
    </div>
  );
}
