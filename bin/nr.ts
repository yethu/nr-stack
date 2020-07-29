#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { NrStack } from '../lib/nr-stack';
import { SecretStack } from '../lib/secret-stack';

const app = new cdk.App();
new NrStack(app, 'NrStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    },
    owner: 'yethu',
    repo: 'devops-test',
});
new SecretStack(app, 'SecretStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION,
    }
});
