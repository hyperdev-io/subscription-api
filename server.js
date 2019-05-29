const express = require('express');
const bodyParser = require('body-parser');
const yaml = require('js-yaml');
const Fetch = require('./fetch.js');
const DevFetch = require('./devFetch.js');
const {getInvoices, getContactData} = require('./moneybird');

const {ENV} = process.env;

const server = express();
server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());

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

server.get('/api/config', function (req, res) {
    let result = {};

    function onFulfilledSubscription(data) {
        let obj = yaml.load(data);
        result.users = obj.users;
    }

    function onFulfilledHosts(data) {
        let obj = yaml.load(data);

        let workers = [];
        for (worker in obj.all.children.workers.hosts) {
            workers.push({name: worker});
        }
        result.workers = workers;
        result.workers_memory = workers.length * 16

        let build_slaves = [];
        for (build_slave in obj.all.children.build_slaves.hosts) {
            build_slaves.push({name: build_slave});
        }
        result.build_slaves = build_slaves;

        let lvm_volumes = [];
        result.diskspace = 0;

        obj.all.children.nfs.hosts.nfs.lvm_volumes.forEach((value, index) => {
            lvm_volumes.push({name: value.lv_name});
            let memory = 100;
            if (index === 0) {
                memory = 200;
            }
            result.diskspace = result.diskspace + memory
        });
        result.lvm_volumes = lvm_volumes;


        res.status(200).send(result);
    }


    fetch.fetchFromFile(req, 'subscription.yml')
        .then(data => onFulfilledSubscription(data)).then(() => {
        fetch.fetchFromFile(req, 'hosts')
            .then(data => onFulfilledHosts(data))
            .catch(error => {
                onRejected(error)
            });
    })
        .catch(error => {
            onRejected(error)
        });

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err
        });
    }

});

server.get('/api/users', function (req, res) {
    function onFulfilled(data) {
        let obj = yaml.load(data);
        res.status(200).send(obj);
    }


    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err
        });
    }

    fetch.fetchFromFile(req, 'hosts')
        .then(data => onFulfilled(data))
        .catch(error => {
            onRejected(error)
        });

});

server.get('/api/workers', function (req, res) {

    function onFulfilled(data) {
        let obj = yaml.load(data);
        let workers = {workers: []};
        for (worker in obj.all.children.workers.hosts) {
            workers.workers.push({name: worker});
        }
        res.status(200).send(workers);
    }

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err
        });
    }

    fetch.fetchFromFile(req, 'hosts')
        .then(data => onFulfilled(data))
        .catch(error => {
            onRejected(error)
        });

});

server.get('/api/can_view_invoices', async function (req, res) {

    try {
        const {moneybird} = await loadSubscriptionFile(req)
        if (moneybird.contact_id && moneybird.reference) {
            res.status(200).send({message: true});
        }
    } catch (err) {
        res.status(200).send({message: false});
    }
});

server.get('/api/invoices', async function (req, res) {
    const {moneybird} = await loadSubscriptionFile(req)

    console.log('Fetching invoice data from moneybird')
    try {
        const invoices = await getInvoices(moneybird.contact_id, moneybird.reference);
        res.status(200).send(invoices);
    } catch (err) {
        res.status(500).send({message: "Error fetching invoices, is the configuration available?"});
    }
});

server.get('/api/invoice_contact', async function (req, res) {

    const {moneybird} = await loadSubscriptionFile(req)
    console.log('Fetching contact data from moneybird')
    try {
        const contact_data = await getContactData(moneybird.contact_id);
        res.status(200).send(contact_data);
    } catch (err) {
        res.status(500).send({message: "Error fetching invoice contact, is the configuration available?"});
    }
});

server.post('/api/workers', function (req, res) {
    function onFulfilled() {
        res.status(200).send();
    }

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err.message
        });
    }

});

server.get('/api/build-slaves', function (req, res) {
    function onFulfilled(data) {
        let obj = yaml.load(data);
        let build_slaves = {build_slaves: []};
        for (build_slave in obj.all.children.build_slaves.hosts) {
            build_slaves.build_slaves.push({name: build_slave});
        }
        res.status(200).send(build_slaves);
    }

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err
        });
    }

    fetch.fetchFromFile(req, 'hosts')
        .then(data => onFulfilled(data))
        .catch(error => {
            onRejected(error)
        });

});

server.post('/api/build_slaves', function (req, res) {
    function onFulfilled() {
        res.status(200).send();
    }

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err.message
        });
    }

});

server.listen(3100, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3100')
});
