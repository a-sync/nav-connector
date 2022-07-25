const { pick, omitBy, isEmpty } = require('lodash');

const createBaseRequest = require('./create-base-request.js');
const sendRequest = require('./send-request.js');

/**
 * Query previously sent invoices with query params.
 * @async
 * @param {Object} params Function params.
 * @param {number} params.page Integer page to query.
 * @param {string} params.invoiceDirection outbound or inbound request type.
 * @param {Object} params.queryParams Query multiple invoices with params. Use dateFrom/dateTo (invoiceIssueDate) or dateTimeFrom/dateTimeTo (insDate) but not both!
 * @param {string} queryParams.dateFrom - REQUIRED valid date string to search from (2010-01-01)
 * @param {string} queryParams.dateTo - REQUIRED valid date string to search to
 * @param {string} queryParams.dateTimeFrom - REQUIRED UTC date time string to search from (2010-01-01T00:00:00Z)
 * @param {string} queryParams.dateTimeTo - REQUIRED UTC date time string to search to
 * @param {string} queryParams.taxNumber - OPTIONAL Tax number of the invoice supplier or customer
 * @param {string} queryParams.groupMemberTaxNumber - OPTIONAL Tax number of group member for the invoice supplier or customer
 * @param {string} queryParams.name - OPTIONAL Left side text matching for the invoice supplier or customer search parameter
 * @param {string} queryParams.invoiceCategory - OPTIONAL Invoice category type
 * @param {string} queryParams.paymentMethod - OPTIONAL Payment method
 * @param {string} queryParams.invoiceAppearance - OPTIONAL Appearance of the invoice
 * @param {string} queryParams.source - OPTIONAL Data report source
 * @param {string} queryParams.currency - OPTIONAL Invoice currency
 * @param {string} queryParams.transactionId - OPTIONAL The searched transaction ID
 * @param {number} queryParams.index - OPTIONAL Index of the searched invoice within the transaction
 * @param {string} queryParams.invoiceOperation - OPTIONAL Invoice operation search parameter
 * @param {Object} params.technicalUser Technical user’s data.
 * @param {Object} params.softwareData Invoice software data.
 * @param {Object} params.axios Axios instance.
 * @returns {Promise<Object>} queryResults
 */
module.exports = async function queryInvoiceDigest({
  page,
  invoiceDirection,
  queryParams,
  technicalUser,
  softwareData,
  axios,
}) {
  const request = createBaseRequest({
    requestType: 'QueryInvoiceDigestRequest',
    technicalUser,
    softwareData,
  });

  const mandatoryQueryParams = {};
  if (queryParams.dateTimeFrom && queryParams.dateTimeTo) {
    mandatoryQueryParams.insDate = pick(queryParams, ['dateTimeFrom', 'dateTimeTo']);
  } else {
    mandatoryQueryParams.invoiceIssueDate = pick(queryParams, ['dateFrom', 'dateTo']);
  }

  /* Normalize queryParams key order. */
  Object.assign(request.QueryInvoiceDigestRequest, {
    page,
    invoiceDirection,
    invoiceQueryParams: {
      mandatoryQueryParams,
      additionalQueryParams: pick(queryParams, [
        'taxNumber',
        'groupMemberTaxNumber',
        'name',
        'invoiceCategory',
        'paymentMethod',
        'invoiceAppearance',
        'source',
        'currency',
      ]),
      transactionQueryParams: pick(queryParams, [
        'transactionId',
        'index',
        'invoiceOperation',
      ]),
    },
  });

  request.QueryInvoiceDigestRequest.invoiceQueryParams = omitBy(
    request.QueryInvoiceDigestRequest.invoiceQueryParams,
    isEmpty
  );

  const responseData = await sendRequest({
    request,
    axios,
    path: '/queryInvoiceDigest',
  });

  const { invoiceDigestResult } = responseData.QueryInvoiceDigestResponse;
  if (!invoiceDigestResult) {
    return responseData.QueryInvoiceDigestResponse;
  }

  /* Type conversions. */
  invoiceDigestResult.currentPage = Number(invoiceDigestResult.currentPage);
  invoiceDigestResult.availablePage = Number(invoiceDigestResult.availablePage);

  const { invoiceDigest } = invoiceDigestResult;

  if (invoiceDigest) {
    /* Normalize to Array. */
    invoiceDigestResult.invoiceDigest = Array.isArray(invoiceDigest)
      ? invoiceDigest
      : [invoiceDigest];

    /* Type conversions. */
    invoiceDigestResult.invoiceDigest.forEach(digest => {
      /* eslint-disable no-param-reassign */
      digest.invoiceNetAmount = Number(digest.invoiceNetAmount);
      digest.invoiceVatAmountHUF = Number(digest.invoiceVatAmountHUF);
      /* eslint-enable no-param-reassign */
    });
  }

  return {...invoiceDigestResult, requestXml: responseData.requestXml};
};
