import React from 'react';
import './FileUpload.css';

const FileUpload = ({ onFileParsed }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onFileParsed(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="file-upload">
      <label htmlFor="xml-upload">Upload your MyAnimeList XML file</label>
      <input id="xml-upload" type="file" accept=".xml" onChange={handleFileChange} />
    </div>
  );
};

export default FileUpload;
