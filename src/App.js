import React, { useState, useRef } from 'react';
import { XMLParser } from 'fast-xml-parser';
import FileUpload from './components/FileUpload';
import AnimeList from './components/AnimeList';
import './App.css';

function App() {
  const [animeList, setAnimeList] = useState([]);
  const [completedTop1000, setCompletedTop1000] = useState(0);
  const [allTop1000, setAllTop1000] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculationRef = useRef(0); // Used to track the current calculation job

  const fetchAndProcessDetails = async (queue, runId) => {
    const BATCH_SIZE = 3;
    let totalCompleted = 0;
    let totalAll = 0;

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      if (runId !== calculationRef.current) return;

      const batch = queue.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(anime => 
        fetch(`https://api.jikan.moe/v4/anime/${anime.series_animedb_id}`)
          .then(res => res.ok ? res.json() : Promise.reject(`Failed to fetch ${anime.series_animedb_id}`))
          .then(response => ({ response, animeId: anime.series_animedb_id }))
          .catch(() => null)
      );

      const results = await Promise.all(promises);

      if (runId !== calculationRef.current) return;

      const updates = [];
      for (const result of results) {
        if (result && result.response && result.response.data) {
          const jikanData = result.response.data;
          const originalAnime = queue.find(a => a.series_animedb_id === result.animeId);

          if (originalAnime) {
            updates.push({
              animeId: result.animeId,
              jikanImageUrl: jikanData.images.jpg.image_url,
              jikanPopularity: {
                rank: jikanData.popularity,
                members: jikanData.members,
              },
            });

            const status = originalAnime.my_status;
            const isRelevant = status === 'Completed' || status === 'Watching' || status === 'On-Hold';
            if (isRelevant && jikanData.popularity <= 1000) {
              totalAll++;
              if (status === 'Completed') {
                totalCompleted++;
              }
            }
          }
        }
      }

      // Update the animeList with the new data from the batch
      setAnimeList(prevList =>
        prevList.map(anime => {
          const update = updates.find(u => u.animeId === anime.series_animedb_id);
          return update ? { ...anime, ...update } : anime;
        })
      );
      
      // Update the counters with the new running totals
      setCompletedTop1000(totalCompleted);
      setAllTop1000(totalAll);

      if (i + BATCH_SIZE < queue.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (runId === calculationRef.current) {
      setIsCalculating(false);
    }
  };

  const handleFileParsed = (xmlData) => {
    calculationRef.current += 1;
    const currentRunId = calculationRef.current;

    const parser = new XMLParser();
    const parsedData = parser.parse(xmlData);

    if (parsedData.myanimelist && parsedData.myanimelist.anime) {
      const allAnime = parsedData.myanimelist.anime;
      
      setAnimeList(allAnime);
      setCompletedTop1000(0);
      setAllTop1000(0);
      setIsCalculating(true);
      
      // We process all anime to get their images and popularity
      fetchAndProcessDetails(allAnime, currentRunId);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>MyAnimeList Reader</h1>
        <div className="counters">
          <div className="counter">
            <span className="counter-label">Completed in Top 1000:</span>
            <span className="counter-value">{isCalculating ? 'Calculating...' : completedTop1000}</span>
          </div>
          <div className="counter">
            <span className="counter-label">All Activity in Top 1000:</span>
            <span className="counter-value">{isCalculating ? 'Calculating...' : allTop1000}</span>
          </div>
        </div>
      </header>
      <main>
        <FileUpload onFileParsed={handleFileParsed} />
        <AnimeList animeList={animeList} />
      </main>
    </div>
  );
}

export default App;