/**
 * API Setu Integration Adapter Service
 * 
 * Government of India API Setu (DigiLocker / National e-Governance Division) Integration Layer.
 * 
 * REQUIRED ENVIRONMENT VARIABLES FOR LIVE INTEGRATION:
 * - API_SETU_CLIENT_ID: Official API Setu Client Identifier
 * - API_SETU_API_KEY: Official API Setu API Key / Secret
 * - API_SETU_BASE_URL: Base URL for API Setu gateway (e.g. https://apisetu.gov.in/api/v1)
 */

const axios = require('axios');

function isConfigured() {
  return Boolean(
    process.env.API_SETU_CLIENT_ID &&
    process.env.API_SETU_API_KEY &&
    process.env.API_SETU_BASE_URL
  );
}

async function verifyCertificate({ docType, certificateNumber, applicantId }) {
  if (!isConfigured()) {
    return {
      status: 'configuration_required',
      verified: false,
      message: 'API Setu production credentials and API endpoint are not configured in environment variables. Certificate verification cannot be performed without authorized credentials.',
      requiredEnvVars: [
        'API_SETU_CLIENT_ID',
        'API_SETU_API_KEY',
        'API_SETU_BASE_URL'
      ]
    };
  }

  try {
    const response = await axios.post(
      `${process.env.API_SETU_BASE_URL}/verify`,
      {
        docType,
        certificateNumber,
        applicantId
      },
      {
        headers: {
          'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID,
          'X-APISETU-APIKEY': process.env.API_SETU_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      status: 'success',
      verified: Boolean(response.data?.verified),
      details: response.data
    };
  } catch (error) {
    return {
      status: 'error',
      verified: false,
      message: `API Setu verification request failed: ${error.message}`
    };
  }
}

async function fetchIssuedDocument({ docType, uri }) {
  if (!isConfigured()) {
    return {
      status: 'configuration_required',
      retrieved: false,
      message: 'API Setu production credentials are not configured in environment variables. Government document retrieval is disabled until credentials are provided.',
      requiredEnvVars: [
        'API_SETU_CLIENT_ID',
        'API_SETU_API_KEY',
        'API_SETU_BASE_URL'
      ]
    };
  }

  try {
    const response = await axios.get(
      `${process.env.API_SETU_BASE_URL}/document`,
      {
        params: { docType, uri },
        headers: {
          'X-APISETU-CLIENTID': process.env.API_SETU_CLIENT_ID,
          'X-APISETU-APIKEY': process.env.API_SETU_API_KEY
        },
        timeout: 10000
      }
    );

    return {
      status: 'success',
      retrieved: true,
      documentData: response.data
    };
  } catch (error) {
    return {
      status: 'error',
      retrieved: false,
      message: `API Setu document fetch failed: ${error.message}`
    };
  }
}

module.exports = {
  isConfigured,
  verifyCertificate,
  fetchIssuedDocument
};
