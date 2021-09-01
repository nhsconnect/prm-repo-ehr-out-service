# prm-deductions-repo-to-gp
This component is responsible for creating and handling of the registration request, when the Orphaned/Stranded health record stored in Repository is requested by the new practice.

When the message handler receives an EHR request and sends this to the RepoToGP component, the RepoToGP accepts this request and creates a new registration request associated with that EHR request so that it can keep track of the transfer.
After the successful validation of the request and retrieval of patient's health record, it sends EHR out to the requesting practice.


## Prerequisites

Follow the links to download

- [Node](https://nodejs.org/en/download/package-manager/#nvm) - version 14.x
- [Docker](https://docs.docker.com/install/)
- [kudulab/dojo](https://github.com/kudulab/dojo#installation)

### AWS helpers

This repository imports shared AWS helpers from [prm-deductions-support-infra](https://github.com/nhsconnect/prm-deductions-support-infra/).
They can be found `utils` directory after running any task from `tasks` file.

## Directories

| Directory         | Description                                       |
| :---------------- | :------------------------------------------------ |
| /test/docker      | Contains smoke test for docker                    |
| /test/functional  | Contains end-to-end tests                         |
| /gocd             | Contains the GoCD pipeline files                  |
| /src              | The source code                                   |
| /terraform        | Terraform to deploy app as a Fargate task in AWS  |
| /scripts          | Useful scripts (e.g. for sending canary messages) |
| /utils            | Contains aws-helpers                              |

## Starting the app

In order to run tasks with npm locally on your host (outside of dojo), you'll need to install postgresql:
```
brew install postgresql
```

### Locally

1. Run `npm install` to install all node dependencies.
2. Configure local environment variables:
    - enter `dojo`
    - run `./tasks _setup_test_integration_local`
3. Run `npm run start:local`
4. If successful, you will be able to reach the Swagger docs: [http://localhost:3000/swagger/](http://localhost:3000/swagger/)

Note: `npm run start:nodemon` can be used to build the app before launching the Express server on port `3000` using [nodemon](https://www.npmjs.com/package/nodemon) - it will watch and reload the server upon any file changes.

### Debugging and testing the app docker image

A Docker image can be built locally with:

1. Run `./tasks build`
2. Run `./tasks build_docker_local`. This builds the docker containers `deductions/<component-name>:<commit-no>` and `deductions/<component-name>:latest` with the app in
3. Run `./tasks test_docker_local` to ensure the image has been built correctly
4. If the above fails, `./tasks run_docker_local` to debug production build

## Swagger

The swagger documentation for the app can be found at [http://localhost:3000/swagger](http://localhost:3000/swagger). To update it, change the
`src/swagger.json` file. You can use [this editor](https://editor.swagger.io/) which will validate your changes.

## Tests

### Unit tests

Run the unit tests with `npm run test:unit` (or `npm test` to run it with lint). 

Alternatively, `./tasks test` can be used to run the tests with Dojo.

### Integration tests

Enter `dojo -c Dojofile-itest`
Run `./tasks test_integration` to run with Dojo.

### Coverage tests

Runs the coverage tests (unit test and integration test) and collects coverage metrics.
Enter `dojo -c Dojofile-itest`
Run `./tasks test_coverage` to run within Dojo.

### Local Docker tests

Run `./tasks test_docker_local`. Make sure you have followed the steps to start the app in production mode beforehand.

### Functional tests

Run `./tasks test_functional`. This will run the end to end tests within [./test/functional](./test/functional). (Note you may need to be connected to VPN).

## Pre-commit Checks

Before committing, ensure you run the following tests:

1. Unit tests
2. Integration tests
3. Coverage tests
4. Local docker test

#### Environment variables

Below are the environment variables that are automatically set:

- `NHS_ENVIRONMENT` - is set to the current environment in which the container is deployed. It is set in Terraform and populated by the pipeline.gocd.yml for tests.
- `SERVICE_URL` - This is prepopulated by `tasks` and will configure it to service URL according to environment.
- `REPOSITORY_URI` - This is prepopulated by `tasks` (based on `IMAGE_REPO_NAME`)

## Access to AWS

In order to get sufficient access to work with terraform or AWS CLI, please follow the instructions on this [confluence pages](https://gpitbjss.atlassian.net/wiki/spaces/TW/pages/11384160276/AWS+Accounts+and+Roles)
and [this how to?](https://gpitbjss.atlassian.net/wiki/spaces/TW/pages/11286020174/How+to+set+up+access+to+AWS+from+CLI)

As a note, this set-up is based on the README of assume-role [tool](https://github.com/remind101/assume-role)

## Assume role with elevated permissions

### Install `assume-role` locally:
`brew install remind101/formulae/assume-role`

Run the following command with the profile configured in your `~/.aws/config`:

`assume-role dev [here choose one of the options from your config: ci/dev/test]`

### Run `assume-role` with dojo:
Run the following command with the profile configured in your `~/.aws/config`:

`eval $(dojo "echo <mfa-code> | assume-role dev"`
or
`assume-role dev [here choose one of the options from your config: ci/dev/test]`

Run the following command to confirm the role was assumed correctly:

`aws sts get-caller-identity`

Work with terraform as per usual:

```
terraform init
terraform apply
```

If your session expires, exit the container to drop the temporary credentials and run dojo again.
