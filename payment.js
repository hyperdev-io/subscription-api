const MOLLIE_KEY = 'test_axc6jebk6tphaEhDPGeNS6uvxwwv87';
const mollie_client = require('@mollie/api-client')({ apiKey: MOLLIE_KEY });

const {createDB} = require('./db');
const payment_database = createDB('mollie_db')


exports.createPaymentData = (invoice) => new Promise(async (resolve, reject) => {

    try {

        const payment = createPaymentForInvoice(invoice);
        const data = {_id: invoice.id, invoice, payment};
        await payment_database.insert(data, (err, docs) => {
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
        value = '10.00';
    }

    try {
        const payment = await mollie_client.payments.create({
            amount: {
                value,
                currency: invoice.currency,
            },
            description: "MY first payment",
            redirectUrl: `http://dashboard.hyperdev.local:8081/_portal/pay?invoice_id=${invoice.id}`,
        });
        resolve(payment);
    } catch (err) {
        console.log(err)
        reject(Error("Could not create payment with payment provider"));
    }
});


const renewPayment = (invoiceId) => new Promise ( async (resolve, reject) => {
    let paymentData = await getPaymentFromDB(invoiceId);
    let newPayment = await createPaymentForInvoice(paymentData.invoice);

    payment_database.update({_id: invoice.id}, {payment: newPayment}, {}, (err, numAffected, affectedDocument) => {
        if (err) {
            reject(err);
        }
        resolve(newPayment);
    })

});


exports.getPaymentData = (invoiceId) => new Promise( async (resolve, reject) => {
    let paymentData = await getPaymentFromDB(invoiceId);

    if (paymentData != null) {
        var updatedPayment = await getPaymentUpdate(paymentData.payment.id);

        // transparantly renew payment
        if (updatedPayment.status == 'expired') {
            updatedPayment = await renewPayment(invoiceId);
        }

        paymentData = {...paymentData, payment: updatedPayment};
        await updatePaymentData(invoiceId, paymentData);
    }

    resolve(paymentData);
});


const getPaymentUpdate = (payment_id) => mollie_client.payments.get(payment_id)


const getPaymentFromDB = (invoiceId) => new Promise( (resolve, reject) => {
    payment_database.findOne({_id: invoiceId}, (err, docs) => {
        if (err) {
            reject(err);
        }
        resolve(docs);
    });
});


updatePaymentData = (invoiceId, update) => new Promise( async (resolve, reject) => {

    try {
        payment_database.update({_id: invoiceId}, update, {returnUpdatedDocs: true}, (err, numAffected, affectedDocument) => {
            if (err) {
                reject(err);
            }
            resolve(affectedDocument);
        });

    } catch (err) {
        console.log(err);
        reject(Error(`No payment exists for invoice ${invoiceId}`))
    }

});
