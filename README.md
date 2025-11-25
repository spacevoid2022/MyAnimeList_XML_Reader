# MyAnimeList XML Reader

This application allows you to upload an XML export of your MyAnimeList anime list and gain insights into your viewing habits.

## Features:
- **Visualize Your List:** Displays your anime entries in an easy-to-read card format, complete with official cover images (fetched automatically from MyAnimeList via Jikan API).
- **Popularity Counters:**
    - **Completed in Top 1000:** Counts how many of your *completed* anime fall within the top 1000 most popular anime on MyAnimeList.
    - **All Activity in Top 1000:** Counts how many of your *currently watching, on-hold, or completed* anime fall within the top 1000 most popular anime on MyAnimeList.
- **Dynamic Data:** Images, popularity rank, and member counts are fetched from the Jikan API after uploading your XML file, providing up-to-date information.

## Technical Details:
- Built with React.
- Uses `fast-xml-parser` for XML parsing.
- Fetches dynamic anime data (images, rank, members) from the Jikan API (jikan.moe).
- Implements a batched, rate-limited fetching mechanism to efficiently retrieve data for all your anime without overloading the API.