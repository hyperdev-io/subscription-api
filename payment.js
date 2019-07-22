const {MOLLIE_KEY} = process.env;
const mollie_client = require('@mollie/api-client')({ apiKey: MOLLIE_KEY });

const {createDB} = require('./db');
const payment_database = createDB('mollie_db')

// invoice: object with invoice data (straight from moneybird)
// payment: object with payment data (straight from mollie)
// invoice_payment: object used with the local DB, essentially a join table: {_id: invoice.id, payment_id: payment.id}
// TODO: this currently only allows for one payment per invoice.

const createPaymentData = (invoice) => new Promise(async (resolve, reject) => {

    try {

        const payment = await createPaymentForInvoice(invoice);
        const invoice_payment = {_id: invoice.id, payment_id: payment.id};
        await payment_database.insert(invoice_payment, (err, docs) => {
            if (err) {
                reject(err);
            } 
            resolve(payment);
        });

    } catch (err) {
        reject(err);
    }
});



const createPaymentForInvoice = (invoice) => new Promise ( async (resolve, reject) => {
    let value;
    // if the string only has a single character after the dot, add a zero
    // e.g. 10.0 -> 10.00, 12.5 -> 12.50
    if (invoice.total_unpaid.match(/\..$/)) {
        value = `${invoice.total_unpaid}0`;
    } else {
        value = invoice.total_unpaid;
    }

    if (value == '0.00' && MOLLIE_KEY.startsWith('test_')) {
        value = '13.37';
    }

    try {
        const payment = await mollie_client.payments.create({
            amount: {
                value,
                currency: invoice.currency,
            },
            // Mollie also uses the  description in e.g. bank statements, so we put the payment reference here for moneybird to pick-up later
            description: `${invoice.payment_reference} HyperDev invoice ${invoice.invoice_id}`,
            redirectUrl: `http://dashboard.hyperdev.local:8081/portal/invoices?payment_invoice_id=${invoice.id}`,
        });
        resolve(payment);
    } catch (err) {
        console.debug(err)
        reject(Error("Could not create payment with payment provider"));
    }
});




const getPaymentUpdate = (payment_id) => mollie_client.payments.get(payment_id)


const getPaymentFromDB = (invoiceId) => new Promise( (resolve, reject) => {
    console.debug("looking for invoice: ", invoiceId)
    payment_database.findOne({_id: invoiceId}, (err, invoice_payment) => {
        if (err) {
            console.debug("Did not find invoice payment: ", err)
            reject(err);
        }
        console.debug("found invoice payment: ", invoice_payment)
        resolve(invoice_payment);
    });
});



exports.getPaymentForInvoice = (invoice) => new Promise( async (resolve, reject) => {

    // look in DB for invoice_payment
    let paymentData = await getPaymentFromDB(invoice.id).catch(null);


    const payment = await (async () => { 
        if (paymentData === null) {
            // no previous payment exists
            return await createPaymentData(invoice);
        } else {
            // a previous payment exists, so we check it's status
            const {payment_id} = paymentData;
            const payment_update =await getPaymentUpdate(payment_id);
            if (payment_update.status == 'expired') {
                console.debug("payment is expired")
                // Renew payment
            } else {
                return payment_update;
            }
        }
    })()


    resolve(payment)
});
