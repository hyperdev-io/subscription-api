const fetch = require('node-fetch');
const yaml = require('js-yaml');

const {GITHUB_OWNER, GITHUB_REPO, AUTH_TOKEN, BRANCH_NAME, ENV} = process.env;

function handleErrors(response) {
    if (!response.ok) {
        throw response;
    }
    return response;
}

class Fetch {
    constructor() {
    }

    fetchFromFile(req, fileName) {
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
}

module.exports = Fetch;
