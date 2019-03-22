const express = require('express');
const next = require('next');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const yaml = require('js-yaml');

const dev = process.env.NODE_ENV !== 'production';
const ENV = process.env.ENV || 'dev'; //dev, test, prod
const {GITHUB_OWNER, GITHUB_REPO, PROJECT_NAME, AUTH_TOKEN} = process.env;

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

            function onRejected(err) {
                res.status(500).send({error: 'Settings fetch error - ' + err.message});
            }


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


        })

        server.get('*', (req, res) => {
            return handle(req, res)
        })


        server.listen(3000, (err) => {
            if (err) throw err
            console.log('> Ready on http://localhost:3000')
        })
    })
    .catch((ex) => {
        console.error(ex.stack)
        process.exit(1)
    })
