import React from 'react';
import AnimeCard from './AnimeCard';
import './AnimeList.css';

const AnimeList = ({ animeList }) => {
  if (!animeList || animeList.length === 0) {
    return <p>Upload a file to see your list.</p>;
  }

  return (
    <div className="anime-list">
      {animeList.map((anime, index) => (
        <AnimeCard key={index} anime={anime} />
      ))}
    </div>
  );
};

export default AnimeList;
