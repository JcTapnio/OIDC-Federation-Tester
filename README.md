
# OIDC-Federation-Tester

Welcome to OIDC-Federation-Tester! This project utilizes environmental variables for configuration. Follow the instructions below to set up the required environmental variables.


## Pre-requisites

This project requires NodeJS to be installed in your computer.
## Environment Variables

To run this project, you will need to add the following environment variables to your .env file.

Create a .env file in the project and add the following:

`ISSUER` = issuer from OIDC OP Metada

`CLIENT_ID` = OIDC RP client id

`CLIENT_SECRET` = OIDC RP client secret

`REDIRECT_URI` = http:localhost:8080/login/callback

`GIGYA_API_KEY` = Site API Key

## Run Locally

Clone the project

```bash
  git clone https://github.com/JcTapnio/OIDC-Federation-Tester.git
```

Go to the project directory

```bash
  cd OIDC-Federation-Tester
```

Install dependencies

```bash
  npm install
```

Start the server

```bash
  npm start
```

## Logout Function

To use the logout function.
Make sure that the `views/user.ejs` gigya SDK is using your current environment API Key

Edit this line `src="https://cdns.gigya.com/JS/gigya.js?apiKey=<API_KEY>"`
