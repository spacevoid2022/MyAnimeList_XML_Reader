import React from 'react';
import './AnimeCard.css';

const AnimeCard = ({ anime }) => {
  // This is now a "dumb" component. It only renders the props it's given.
  // All data fetching and state management is handled by the App component.

  // Use the image from Jikan if it exists, otherwise show a placeholder or nothing.
  const imageUrl = anime.jikanImageUrl || ''; 

  return (
    <div className="anime-card">
      <div className="anime-card-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={anime.series_title} />
        ) : (
          <div className="placeholder-image"></div>
        )}
      </div>
      <div className="anime-card-info">
        <h3>{anime.series_title}</h3>
        <p>Score: {anime.my_score}</p>
        <p>Status: {anime.my_status}</p>
        <p>Progress: {anime.my_watched_episodes} / {anime.series_episodes}</p>
        
        <div className="popularity-section">
          {anime.jikanPopularity ? (
            <>
              <p>Rank: #{anime.jikanPopularity.rank}</p>
              <p>{anime.jikanPopularity.members.toLocaleString()} members</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AnimeCard;
