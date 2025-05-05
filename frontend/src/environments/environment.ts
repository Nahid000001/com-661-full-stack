export const environment = {
    production: false,
    apiUrl: 'http://localhost:5000',
    withCredentials: true,
    googleMapsApiKey: 'AIzaSyDYIJNwoGmGS9wD0csiiQo4ut9Ie00dgSM',
    googleMapsDomain: 'localhost',
    cache: {
      enabled: true,
      duration: 5 * 60 * 1000, // 5 minutes in milliseconds
      maxSize: 100 // Maximum number of items to cache
    },
    timeouts: {
      default: 10000, // 10 seconds
      health: 3000,  // 3 seconds
      critical: 15000 // 15 seconds
    }
  };