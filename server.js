const express = require('express');
const next = require('next');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const yaml = require('js-yaml');

const dev = process.env.NODE_ENV !== 'production';
const ENV = process.env.ENV || 'dev'; //dev, test, prod
const {GITHUB_OWNER, GITHUB_REPO, AUTH_TOKEN} = process.env;

const app = next({dev});
const handle = app.getRequestHandler();

function handleErrors(response) {
    if (!response.ok) {
        throw response;
    }
    return response;
}

app.prepare()
    .then(() => {
        const server = express()
        server.use(bodyParser.urlencoded({extended: true}));
        server.use(bodyParser.json());

        server.get('/api/get-config', function (req, res) {
            function onFulfilled(data) {
                let obj = yaml.load(data);
                res.status(200).send(obj);
            }

            function onApiKeyFetched(data, api_key) {
                let obj = yaml.load(data);

                if (obj.user_portal.api_key===api_key){
                    fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PROJECT_NAME}/subscription.yml`, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'client-dashboard',
                            'Accept': 'application/vnd.github.v3.raw',
                            'Authorization': `token ${AUTH_TOKEN}`
                        }
                    }).then(handleErrors)
                        .then(res => res.text().then(data => onFulfilled(data)))
                        .catch(response => {
                            response.json().then(error => onRejected(error))
                        });
                } else {
                    res.status(500).send({
                        error: 'Wrong api-key',
                        message: 'Wrong api-key'
                    });
                }
            }

            function onRejected(err) {
                res.status(500).send({
                    error: 'Settings fetch error - ' + err.message,
                    message: 'Settings fetch error - ' + err.message
                });
            }
            function onApiKeyRejected(err) {
                res.status(500).send({
                    error: 'Api-key error - ' + err.message,
                    message: 'Api-key error - ' + err.message
                });
            }

            let PROJECT_NAME = req.query.project;
            let API_KEY = req.query.api_key;

            fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${PROJECT_NAME}/vars.yml`, {
                method: 'GET',
                headers: {
                    'User-Agent': 'client-dashboard',
                    'Accept': 'application/vnd.github.v3.raw',
                    'Authorization': `token ${AUTH_TOKEN}`
                }
            }).then(handleErrors)
                .then(res => res.text().then(data => onApiKeyFetched(data, API_KEY)))
                .catch(response => {
                    response.json().then(error => onApiKeyRejected(error))
                });
        })

        server.get('*', (req, res) => {
            return handle(req, res)
        })


        server.listen(3100, (err) => {
            if (err) throw err
            console.log('> Ready on http://localhost:3100')
        })
    })
    .catch((ex) => {
        console.error(ex.stack)
        process.exit(1)
    })
