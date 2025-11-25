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

  // Progress states
  const [totalAnimeToProcess, setTotalAnimeToProcess] = useState(0);
  const [processedAnimeCount, setProcessedAnimeCount] = useState(0);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16; // 2 rows * 8 cards per row = 16

  const retryFetch = async (url, attempts = 3, delay = 500) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return response;
        }
        // If it's a 429 (Too Many Requests) or similar temporary error, retry
        if (response.status === 429 || response.status >= 500) {
          console.warn(`API call failed with status ${response.status}. Retrying in ${delay}ms...`);
          await new Promise(res => setTimeout(res, delay));
          delay *= 2; // Exponential backoff
        } else {
          // Other non-retryable errors
          console.error(`API call failed with status ${response.status} for ${url}`);
          return Promise.reject(`Failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error(`API call failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
      }
    }
    return Promise.reject(`Failed to fetch ${url} after ${attempts} attempts`);
  };

  const fetchAndProcessDetails = async (queue, runId) => {
    const BATCH_SIZE = 3;
    let totalCompleted = 0;
    let totalAll = 0;
    let processedThisRun = 0; // Declare and initialize here

    for (let i = 0; i < queue.length; i += BATCH_SIZE) {
      if (runId !== calculationRef.current) return;

      const batch = queue.slice(i, i + BATCH_SIZE);
      
      const promises = batch.map(anime => 
        retryFetch(`https://api.jikan.moe/v4/anime/${anime.series_animedb_id}`)
          .then(response => response.json()) // Parse JSON after successful fetch
          .then(data => ({ data, animeId: anime.series_animedb_id }))
          .catch(() => null) // Handle overall failure of this specific anime fetch
      );

      const results = await Promise.all(promises);

      if (runId !== calculationRef.current) return;

      const updates = [];
      for (const result of results) {
        if (result && result.data && result.data.data) { // Ensure data is present
          const jikanData = result.data.data;
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

      processedThisRun += batch.length;
      setProcessedAnimeCount(processedThisRun); // Update progress
      
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
      setProcessedAnimeCount(0); // Reset progress
      setTotalAnimeToProcess(allAnime.length); // Set total for progress
      setIsCalculating(true);
      setCurrentPage(1); // Reset to first page on new upload
      
      // We process all anime to get their images and popularity
      fetchAndProcessDetails(allAnime, currentRunId);
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAnimeCards = animeList.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(animeList.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Ellipsis pagination logic
  const generatePageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 7; // Max number of page buttons to show (including start, end, and current around)

    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const leftBound = Math.max(1, currentPage - 2);
      const rightBound = Math.min(totalPages, currentPage + 2);

      if (leftBound > 1) {
        pageNumbers.push(1);
        if (leftBound > 2) {
          pageNumbers.push('...');
        }
      }

      for (let i = leftBound; i <= rightBound; i++) {
        pageNumbers.push(i);
      }

      if (rightBound < totalPages) {
        if (rightBound < totalPages - 1) {
          pageNumbers.push('...');
        }
        pageNumbers.push(totalPages);
      }
    }
    return pageNumbers;
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
        {isCalculating && totalAnimeToProcess > 0 && (
          <div className="progress-indicator">
            Processing: {processedAnimeCount} / {totalAnimeToProcess} anime
          </div>
        )}
      </header>
      <main>
        <FileUpload onFileParsed={handleFileParsed} />
        <AnimeList animeList={currentAnimeCards} />

        {animeList.length > itemsPerPage && (
          <div className="pagination">
            <button onClick={prevPage} disabled={currentPage === 1}>Previous</button>
            {generatePageNumbers().map((number, index) => (
              typeof number === 'number' ? (
                <button 
                  key={index} 
                  onClick={() => paginate(number)} 
                  className={currentPage === number ? 'active' : ''}
                >
                  {number}
                </button>
              ) : (
                <span key={index} className="ellipsis">...</span>
              )
            ))}
            <button onClick={nextPage} disabled={currentPage === totalPages}>Next</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;