// utils.js

// Function to log error messages to the console
export const logError = (errorMessage) => {
    const timestamp = new Date().toISOString(); // Get the current timestamp
    console.error(`[${timestamp}] ERROR: ${errorMessage}`); // Log the error with a timestamp
  };
  
  // Function to log info messages (optional)
  export const logInfo = (infoMessage) => {
    const timestamp = new Date().toISOString(); // Get the current timestamp
    console.log(`[${timestamp}] INFO: ${infoMessage}`); // Log the info message with a timestamp
  };
  