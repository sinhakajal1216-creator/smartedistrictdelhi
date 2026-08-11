const sdmLocatorService = require('../services/sdmLocator');

sdmLocatorService.loadData();

exports.search = (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid locality query',
        message: 'Please provide a ?q=<locality> parameter'
      });
    }
    
    const result = sdmLocatorService.searchLocality(q);
    
    if (!result) {
      return res.status(404).json({
        error: 'Locality not found',
        query: q,
        message: 'No official MCD ward found for this locality'
      });
    }
    
    return res.status(200).json({
      locality: result.locality,
      ward: result.wardName,
      wardNumber: result.wardNumber,
      acName: result.acName
    });
  } catch (error) {
    console.error('SDM Locator error:', error);
    return res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
};
