# prm-deductions-repo-to-gp
This component is responsible for the registration functionality of our services.

When the message handler receives an EHR request and sends this to the RepoToGP component, the RepoToGP accepts this and creates a new registration request associated with that EHR request so that it can keep track of the transfer. 


## Prerequisites

Follow the links to download

- [Node](https://nodejs.org/en/download/package-manager/#nvm) - version 12.x
- [Docker](https://docs.docker.com/install/)
- [kudulab/dojo](https://github.com/kudulab/dojo#installation)


## Directories

| Directory         | Description                                       |
| :---------------- | :------------------------------------------------ |
| /test/docker      | Contains smoke test for docker                    |
| /test/functional  | Contains end-to-end tests                         |
| /gocd             | Contains the GoCD pipeline files                  |
| /src              | The source code                                   |
| /terraform        | Terraform to deploy app as a Fargate task in AWS  |
| /scripts          | Useful scripts (e.g. for sending canary messages) |


## Starting the app

### Locally

1. Run `npm install` to install all node dependencies.
2. Create an .env file at the root of the directory
3. As a reference for .env values, see ecs-task.tf 
4. Run `npm run start:local`
5. If successful, you will be able to reach the Swagger docs: [http://localhost:3000/swagger/](http://localhost:3000/swagger/)

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

Run the unit tests with `npm run test:unit` (or `npm test` to run it with lint). Alternatively `./tasks test` can be used to run the tests with Dojo.

### Integration tests

Run `./tasks test_integration` to run with Dojo.

### Coverage tests

Runs the coverage tests (unit test and integration test) and collects coverage metrics.

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

- `NHS_ENVIRONMENT` - is set to the current environment ('dev' for OpenTest and 'test' for PTL environment) in which the container is deployed. It is set in Terraform and populated by the pipeline.gocd.yml for tests.
- `SERVICE_URL` - This is prepopulated by `tasks` and will configure it to service URL according to environment.
- `REPOSITORY_URI` - This is prepopulated by `tasks` (based on `IMAGE_REPO_NAME`)

## Access to AWS

In order to get sufficient access to work with terraform or AWS CLI, please follow the instructions in: https://gpitbjss.atlassian.net/wiki/spaces/TW/pages/11384160276/AWS+Accounts+and+Roles
and https://gpitbjss.atlassian.net/wiki/spaces/TW/pages/11286020174/How+to+set+up+access+to+AWS+from+CLI
  
### Design:
Please follow this design to ensure the ssm keys are easy to maintain and navigate through:

| Type               | Design                                  | Example                                               |
| -------------------| ----------------------------------------| ------------------------------------------------------|
| **User-specified** |`/repo/<env>?/user-input/`               | `/repo/${var.environment}/user-input/db-username`     |
| **Auto-generated** |`/repo/<env>?/output/<name-of-git-repo>/`| `/repo/output/prm-deductions-base-infra/root-zone-id` |

