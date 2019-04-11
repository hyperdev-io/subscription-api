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

                if (obj.project_portal.api_key === API_KEY) {
                    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PROJECT_NAME}/${FILE_NAME}${ref_param}`, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'subscription-api',
                            'Accept': 'application/vnd.github.v3.raw',
                            'Authorization': `token ${AUTH_TOKEN}`
                        }
                    }).then(handleErrors)
                        .then(res => res.text().then(data => {
                            resolve(data)
                        })).catch(response => {
                            console.error(response);
                            response.json().then(error => {
                                reject('Settings fetch error - ' + error.message)
                            })
                        });
                } else {
                    reject('Wrong api-key')
                }


            }))
            .catch(response => {
                console.error(response);
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
    let result = {};

    function onFulfilledSubscription(data) {
        let obj = yaml.load(data);
        result.users = obj.users;
    }
    function onFulfilledHosts(data) {
        let obj = yaml.load(data);

        let workers=[];
        for (worker in obj.all.children.workers.hosts) {
            workers.push({name:worker});
        }
        result.workers = workers;

        let build_slaves=[];
        for (build_slave in obj.all.children['build-slaves'].hosts) {
            build_slaves.push({name:build_slave});
        }
        result.build_slaves = build_slaves;

        res.status(200).send(result);
    }


    fetchFromFile(req, 'subscription.yml')
        .then(data => onFulfilledSubscription(data)).then(()=>{
        fetchFromFile(req, 'hosts')
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

    fetchFromFile(req, 'hosts')
        .then(data => onFulfilled(data))
        .catch(error => {
            onRejected(error)
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
            message: 'Settings fetch error - ' + err
        });
    }

    fetchFromFile(req, 'hosts')
        .then(data => onFulfilled(data))
        .catch(error => {
             onRejected(error)
        });

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
        let build_slaves={build_slaves:[]};
        for (build_slave in obj.all.children['build-slaves'].hosts) {
            build_slaves.build_slaves.push({name:build_slave});
        }
        res.status(200).send(build_slaves);
    }

    function onRejected(err) {
        res.status(500).send({
            message: 'Settings fetch error - ' + err
        });
    }

    fetchFromFile(req, 'hosts')
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
