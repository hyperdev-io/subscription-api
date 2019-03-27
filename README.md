# Client dashboard

!!! Should be subscription.yml file inside client project at Github.com.
Example:
```
workers: 5
build-slaves: 4
users: 3
diskspace: 500MB 
```

Also you should put the api-key variable inside vars.yml (this variable used in user-management. can be any string.)
Example:
```
user_portal:
  api_key: vvsmnsdf-werfds-ewrfds-qweeq-dssdf
```


## Env variables
```
GITHUB_OWNER=%GITHUB_OWNER%;
GITHUB_REPO=%GITHUB_REPO%;
AUTH_TOKEN=%AUTH_TOKEN%;
ENV=dev;
```

 ##### Where to get AUTH_TOKEN
 https://github.com/settings/tokens (and set true for "Full control of private repositories")
