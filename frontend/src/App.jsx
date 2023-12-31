import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { PDFDocument } from "pdf-lib"; // Import pdf-lib in the frontend
import './App.css';

export default function App() {
  // State variables to manage selected file, number of pages, and selected pages
  const [selectedFile, setSelectedFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [selectedPages, setSelectedPages] = useState([]);
  const [buttonText, setButtonText] = useState("Select PDF file");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a reference to the file input element
  const fileInputRef = useRef(null);

  // useEffect hook to fetch the number of pages when a PDF file is selected
  useEffect(() => {
    if (selectedFile) {
      const reader = new FileReader(); // Using client-side JS to read file.
      console.log(selectedFile);
      reader.onload = async () => {  // after file reading is complete
        const pdfBuffer = reader.result;  //contains the data that has been read from the file
        try {
          if (selectedFile.size > 2 * 1024 * 1024) {
            // throw "File size cannot exceed 2MB";
            throw new Error("File size cannot exceed 2MB");
          }
          // Load the PDF document uploaded by user using pdf-lib
          const pdfDoc = await PDFDocument.load(pdfBuffer);
          
          // Get the total number of pages in the PDF document
          const numPages = pdfDoc.getPageCount();
          // console.log("Frontend Page no: " + numPages);
          setNumPages(numPages);
        
        } catch(error) {
          
          // If there is an error in loading the PDF, handle it and show an alert to the user
          alert(error.message);

          // Reset the file input value and clear all state variables related to the selected file
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }

          setSelectedFile(null);
          setNumPages(null);
          setSelectedPages([]);
          setButtonText("Select PDF file");
          return;
        }
      };

      // Read the selected file as an array buffer
      reader.readAsArrayBuffer(selectedFile);
    }
  }, [selectedFile]);

  // Function to handle file selection when a new file is chosen
  const handleFileChange = (event) => {
    
    setNumPages(null);
    setSelectedPages([]);
    setSelectedFile(event.target.files[0]);

    if (selectedPages.length === 0) {
      setButtonText("Select at least one page to continue");
    } else {
      setButtonText("Download Modified PDF");
    }

    if(!event.target.files[0]){
      setButtonText("Select PDF file");
    }

  }; //this triggers the selectedFile useEffect

  // Function to handle checkbox selection for individual pages
  const handleCheckboxChange = (event, page) => {
    const isChecked = event.target.checked;
    const pageNumber = page;

    // Update the list of selected pages based on the checkbox selection
    setSelectedPages((prevSelectedPages) =>
      isChecked
        ? [...prevSelectedPages, pageNumber]
        : prevSelectedPages.filter((p) => p !== pageNumber)
    );

    // Check if any page is selected and update the buttonText accordingly
    if (isChecked && selectedPages.length === 0) {
      setButtonText("Download Modified PDF");
    } else if (!isChecked && selectedPages.length === 1) {
      setButtonText("Select at least one page to continue");
    }

  };

  // Function to handle form submission for PDF modification and download
  const handleSubmit = async (event) => {

    event.preventDefault();

    // Check if a PDF file has been selected before submitting the form
    if (!selectedFile) {
      alert("Please select a PDF file.");
      return;
    }

    if (selectedPages.length === 0) {
      return;
    }

    setIsLoading(true);

    // Create a FormData object to prepare the file for sending to the backend
    const formData = new FormData();
    formData.append("pdfFile", selectedFile);

    // Send selectedPages separately as a JSON object along with the file to the backend
    const selectedPagesData = {
      selectedPages: selectedPages,
    };

    try {
      // Make a POST request to the backend to process the selected pages and return the modified PDF
      // local version: http://localhost:5000/api/upload
      // heroku: https://salty-fortress-70798-fa053f5fd399.herokuapp.com/api/upload
      // render(working): https://split-pdf-backend.onrender.com/api/upload
      const response = await axios.post("https://salty-fortress-70798-fa053f5fd399.herokuapp.com/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        params: selectedPagesData, // Pass selectedPagesData as query params
        responseType: 'blob', // Tell axios to treat the response as a blob
      });

      // Trigger the download of the modified PDF by creating a Blob and using a link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'modified-file.pdf');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Set the download message when the download is successful
      setDownloadMessage("Modified file has been downloaded");

      // Add the 'show' class to make the message visible
      document.querySelector('.download-message').classList.add('show');

      // Automatically remove the 'show' class after 3 seconds
      setTimeout(() => {
        document.querySelector('.download-message').classList.remove('show');
        setDownloadMessage(""); // Clear the download message
      }, 3000);


      // Reset the file input value after the form submission
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error) {
      // If there is an error during the request, show an alert with the error message
      alert("Error uploading the file:", error);
      fileInputRef.current.value = "";
      // Handle errors, show error messages, etc.
    }
    finally {
      setIsLoading(false); // Stop loading
    }

    // Reset all state variables related to the selected file and pages after form submission
    setSelectedFile(null);
    setNumPages(null);
    setSelectedPages([]);
    setButtonText("Select PDF file");
  };

  return (
    <div>
    <div className="logo"><p className="logo-text"><span>S</span>plit<span className="pdf-letter-logo">PDF</span></p></div>
    <div className="main">
        {/* Loading bar */}
      {isLoading && <div className="loading-bar"></div>}
        {/* Heading for the app */}
      <h1>Extract Pages from your <span className="pdf-letter-heading">PDF!</span></h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
            {/* File input element */}
          <input ref={fileInputRef} type="file" className="form-control-file" accept=".pdf" name="pdfFile" onChange={handleFileChange} />
          <br />
            {/* Render the list of pages when the number of pages is known */}
          {numPages !== null && (
            <div>
              <p>Select Pages to Include:</p>
                {/* Render checkboxes for each page */}
              {Array.from({ length: numPages }, (_, index) => (
                <div key={index} style={{ padding: '5px', paddingRight: '10px', display: 'inline-block' }}>
                  <label>
                    Page {index + 1}
                      {/* Checkbox for each page */}
                    <input
                      type="checkbox"
                      className="form-checkbox"
                      name="selectCheckbox"
                      checked={selectedPages.includes(index + 1)} //checks if the current page index is present in the selectedPages array
                      onChange={(event) => handleCheckboxChange(event, index + 1)}
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
          <br />
          {/* Submit button */}
          <input type="submit" value={buttonText} className="btn btn-default" />
        </div>
      </form>
        {/* Display the download message */}
        <div className={`download-message ${downloadMessage ? 'show' : ''}`}>{downloadMessage}</div>
    </div>
    </div>
  );
}
