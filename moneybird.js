const SuperAgent = require('superagent');
const {MONEYBIRD_API_TOKEN, MONEYBIRD_ADMINISTRATION_ID} = process.env;
const {keyBy} = require('lodash');
const {ENV} = process.env;
const Fetch = require('./fetch.js');
const DevFetch = require('./devFetch.js');
const yaml = require('js-yaml');

const use_cache = true;

var fetch;
switch (ENV) {
    case 'prod':
    case 'test':
        fetch = new Fetch();
        break;
    case 'dev':
    default:
        fetch = new DevFetch();
        break;
}

const loadSubscriptionFile = async (req) =>
    yaml.load(await fetch.fetchFromFile(req, 'subscription.yml'))

// list of invoices as received from moneybird, filtered by contact_id
var moneybird_invoices_cache = {};
// the above, but indexed by invoice.id for easy lookup
var moneybird_invoices_index = {};
// contact data as received from moneybird
var moneybird_contact_data_cache = {};

const getProjectName = (req) => {
    if (ENV === 'dev') {
        return '_development';
    } else {
        return req.query.project;
    }
}


getContactId = async (req) => {
    const {moneybird} = await loadSubscriptionFile(req);
    return moneybird.contact_id;
}

getReference = async (req) => {
    const {moneybird} = await loadSubscriptionFile(req);
    return moneybird.reference;
}

exports.getContactData = async (req) => {
    
    const projectName = getProjectName(req);

    if (use_cache && projectName in moneybird_contact_data_cache) {
        console.log("Using cached contact data for moneybird");
        return moneybird_contact_data_cache[projectName];

    } else {
        console.log('Fetching contact data from moneybird');
        const contactId = await getContactId(req);
        const contact_request = await SuperAgent
            .get(`https://moneybird.com/api/v2/${MONEYBIRD_ADMINISTRATION_ID}/contacts/${contactId}`)
            .set('Authorization', `Bearer ${MONEYBIRD_API_TOKEN}`)
            .set('Accept', 'application/json');

        moneybird_contact_data_cache[projectName] = contact_request.body;
        return contact_request.body;
    }
}


exports.getInvoices = async (req) => {

    const projectName = getProjectName(req);

    if (!(use_cache && projectName in moneybird_invoices_cache)) {
        console.log('Fetching invoice data from moneybird');
        const contactId = await getContactId(req);
        const invoices_request = await SuperAgent
            .get(`https://moneybird.com/api/v2/${MONEYBIRD_ADMINISTRATION_ID}/sales_invoices?filter=contact_id:${contactId}`)
            .set('Authorization', `Bearer ${MONEYBIRD_API_TOKEN}`)
            .set('Accept', 'application/json')

        moneybird_invoices_cache[projectName] = invoices_request.body;
        moneybird_invoices_index[projectName] = keyBy(invoices_request.body, (invoice) => invoice.id )

    } else {
        console.log("Using cached invoice data for moneybird");
    }

    const reference = await getReference(req);
    return moneybird_invoices_cache[projectName].filter( (invoice) => invoice.reference === reference );
}

exports.getInvoice = async (req, invoiceId) => {

    const projectName = getProjectName(req);

    if (use_cache && projectName in moneybird_invoices_index) {
        if (invoiceId in moneybird_invoices_index[projectName]) {
            console.log(`Using cached invoice datum for moneybird; ${invoiceId}`);
            return moneybird_invoices_index[projectName][invoiceId];
        }
    } else {
        console.log(`Fetching invoice datum from moneybird: ${invoiceId}`);

        if (!(projectName in moneybird_invoices_index)) {
            moneybird_invoices_index[projectName] = {};
        }

        const invoice_request = await SuperAgent
            .get(`https://moneybird.com/api/v2/${MONEYBIRD_ADMINISTRATION_ID}/sales_invoices/${invoiceId}`)
            .set('Authorization', `Bearer ${MONEYBIRD_API_TOKEN}`)
            .set('Accept', 'application/json')

        moneybird_invoices_index[projectName][invoiceId] = invoice_request.body;
        return invoice_request.body;
    }

}


