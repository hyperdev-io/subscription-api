const SuperAgent = require('superagent');
const {MONEYBIRD_API_TOKEN, MONEYBIRD_ADMINISTRATION_ID} = process.env;

exports.getContactData = async (contactId) => {

    const contact_request = await SuperAgent
        .get(`https://moneybird.com/api/v2/${MONEYBIRD_ADMINISTRATION_ID}/contacts/${contactId}`)
        .set('Authorization', `Bearer ${MONEYBIRD_API_TOKEN}`)
        .set('Accept', 'application/json')
    return contact_request.body
}

exports.getInvoices = async (contactId, reference = null) => {

    const invoices_request = await SuperAgent
        .get(`https://moneybird.com/api/v2/${MONEYBIRD_ADMINISTRATION_ID}/sales_invoices?filter=contact_id:${contactId}`)
        .set('Authorization', `Bearer ${MONEYBIRD_API_TOKEN}`)
        .set('Accept', 'application/json')

    return invoices_request.body.filter( invoice => invoice.reference == reference )
}
