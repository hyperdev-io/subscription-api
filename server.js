const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const yaml = require('js-yaml');

const {GITHUB_OWNER, GITHUB_REPO, AUTH_TOKEN, BRANCH_NAME} = process.env;

function handleErrors(response) {
    if (!response.ok) {
        throw response;
    }
    return response;
}

function fetchFromFile(req, fileName) {
    return new Promise(function (resolve, reject) {
        let FILE_NAME = fileName;
        let PROJECT_NAME = req.query.project;
        let API_KEY = req.query.api_key;

        var ref_param = '';
        if (BRANCH_NAME) {
            ref_param = '?ref=' + BRANCH_NAME;
        }

        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PROJECT_NAME}/vars.yml${ref_param}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'subscription-api',
                'Accept': 'application/vnd.github.v3.raw',
                'Authorization': `token ${AUTH_TOKEN}`
            }
        }).then(handleErrors)
            .then(res => res.text().then(data => {
                let obj = yaml.load(data);

                if (obj.user_portal.api_key === API_KEY) {
                    resolve(fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PROJECT_NAME}/${FILE_NAME}${ref_param}`, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'subscription-api',
                            'Accept': 'application/vnd.github.v3.raw',
                            'Authorization': `token ${AUTH_TOKEN}`
                        }
                    }));
                } else {
                    reject('Wrong api-key')
                }


            }))
            .catch(response => {
                response.json().then(error => {
                    reject('Api-key error - ' + error.message)
                })
            });

    });
}

const server = express();
server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());

server.get('/api/config', function (req, res) {
    function onFulfilled(data) {
        let obj = yaml.load(data);
        res.status(200).send(obj);
    }


    fetchFromFile(req, 'subscription.yml').then(handleErrors)
        .then(res => res.text().then(data => onFulfilled(data)))
        .catch(response => {
            response.json().then(error => onRejected(error))
        });


    function onRejected(err) {
        res.status(500).send({
            error: 'Settings fetch error - ' + err.message
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
            error: 'Settings fetch error - ' + err.message
        });
    }

    fetchFromFile(req, 'hosts').then(handleErrors)
        .then(res => res.text().then(data => onFulfilled(data)))
        .catch(response => {
            response.json().then(error => onRejected(error))
        });

});

server.get('/api/workers', function (req, res) {

    function onFulfilled(data) {
        let obj = yaml.load(data);
        let workers={workers:[]};
        for (worker in obj.all.children.workers.hosts) {
            workers.workers.push({name:worker});
        }
        res.status(200).send(workers);
    }

    function onRejected(err) {
        res.status(500).send({
            error: 'Settings fetch error - ' + err.message
        });
    }

    fetchFromFile(req, 'hosts').then(handleErrors)
        .then(res => res.text().then(data => onFulfilled(data)))
        .catch(response => {
            response.json().then(error => onRejected(error))
        });

});

server.post('/api/workers', function (req, res) {
    function onFulfilled() {
        res.status(200).send();
    }

    function onRejected(err) {
        res.status(500).send({
            error: 'Settings fetch error - ' + err.message
        });
    }

});

server.get('/api/build-slaves', function (req, res) {
    function onFulfilled(data) {
        let obj = yaml.load(data);
        let build_slaves={build_slaves:[]};
        for (build_slave in obj.all.children['build-slaves'].hosts) {
            build_slaves.build_slaves.push({name:build_slave});
        }
        res.status(200).send(build_slaves);
    }

    function onRejected(err) {
        res.status(500).send({
            error: 'Settings fetch error - ' + err.message
        });
    }

    fetchFromFile(req, 'hosts').then(handleErrors)
        .then(res => res.text().then(data => onFulfilled(data)))
        .catch(response => {
            response.json().then(error => onRejected(error))
        });

});

server.post('/api/build_slaves', function (req, res) {
    function onFulfilled() {
        res.status(200).send();
    }

    function onRejected(err) {
        res.status(500).send({
            error: 'Settings fetch error - ' + err.message
        });
    }

});

server.listen(3100, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3100')
});
